import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
import * as XLSX from 'xlsx';

config();

const METAS_FILE = '/home/ubuntu/upload/MetasFAT.XVOL.2026-RegionalSuldeGoiás,NoroesteeAltoParanaíba-MG.xlsx';

async function main() {
  const db = await mysql.createConnection(process.env.DATABASE_URL);

  console.log("=== Importing MetasFAT.XVOL.2026 ===\n");

  // Load representatives from DB
  const [reps] = await db.execute("SELECT id, repCode, name FROM representatives");
  const repByCode = {};
  for (const r of reps) {
    repByCode[String(r.repCode).trim()] = r;
  }

  // Read Excel file - headers are in row 2 (index 1)
  const wb = XLSX.read(readFileSync(METAS_FILE));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Row 1 (index 0) has some headers, row 2 (index 1) has main headers
  // Data starts from row 3 (index 2)
  const headers = rows[1]; // CODIGO, REPRESENTANTE, CODESP, ESPECIE, CODSUBSO, SUBSOLUCAO, CODSOL, SOLUCAO, %, TOTAL, FATURAMENTO, VOLUME/KG, ...
  console.log("Headers:", headers.slice(0, 15));

  // Clear existing metas for fresh import
  await db.execute("DELETE FROM goals WHERE period LIKE '2026%'");
  console.log("Cleared existing 2026 goals\n");

  let inserted = 0;
  let skipped = 0;
  let noRep = 0;

  // Process data rows starting from index 2
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;

    const codigo = String(row[0]).trim();
    const repName = row[1];
    const codesp = row[2];
    const especie = row[3];
    const codsubso = row[4];
    const subsolucao = row[5];
    const codsol = row[6];
    const solucao = row[7];
    const totalAnual = parseFloat(row[9]) || 0;

    // Skip "TOTAIS" row
    if (codigo === 'TOTAIS' || !repName) continue;

    // Find representative
    let repCodePadded = codigo.padStart(6, '0');
    let rep = repByCode[repCodePadded] || repByCode[codigo];

    if (!rep) {
      const repNameClean = String(repName).trim().toUpperCase();
      rep = reps.find(r => String(r.name).trim().toUpperCase().includes(repNameClean.substring(0, 15)));
    }

    if (!rep) {
      noRep++;
      continue;
    }

    // Determine if this is a summary row (no species) or detail row
    const isTotal = !codesp || codesp === '';
    const goalName = isTotal
      ? `Meta Anual 2026 - ${repName}`
      : `Meta 2026 - ${especie || ''} / ${subsolucao || ''} / ${solucao || ''}`;

    const description = isTotal
      ? `Meta total anual 2026 para ${repName}`
      : `Espécie: ${especie || '-'} | Sub-solução: ${subsolucao || '-'} | Solução: ${solucao || '-'}`;

    // Insert annual goal
    if (totalAnual > 0) {
      await db.execute(
        `INSERT INTO goals (representativeId, repCode, name, description, period, targetValue, currentValue, type, status, especie, subsolucao, solucao, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, 0, 'sales', 'on_track', ?, ?, ?, NOW(), NOW())`,
        [
          rep.id,
          rep.repCode,
          goalName,
          description,
          '2026',
          totalAnual,
          especie || null,
          subsolucao || null,
          solucao || null
        ]
      );
      inserted++;
    }

    // Insert monthly goals for detail rows (columns 10-33 are months with FATURAMENTO/VOLUME pairs)
    if (!isTotal) {
      const months = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
      for (let m = 0; m < 12; m++) {
        const colIdx = 10 + (m * 2); // columns 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32 (FATURAMENTO columns)
        const monthVal = parseFloat(row[colIdx]) || 0;
        if (monthVal > 0) {
          const monthNum = String(m + 1).padStart(2, '0');
          const period = `2026-${monthNum}`;
          const monthName = months[m];
          const monthGoalName = `Meta ${monthName}/2026 - ${especie || 'Geral'} / ${solucao || ''}`;

          await db.execute(
            `INSERT INTO goals (representativeId, repCode, name, description, period, targetValue, currentValue, type, status, especie, subsolucao, solucao, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, 0, 'sales', 'on_track', ?, ?, ?, NOW(), NOW())`,
            [
              rep.id,
              rep.repCode,
              monthGoalName,
              description,
              period,
              monthVal,
              especie || null,
              subsolucao || null,
              solucao || null
            ]
          );
          inserted++;
        }
      }
    }
  }

  const [countResult] = await db.execute("SELECT COUNT(*) as cnt FROM goals WHERE period LIKE '2026%'");
  console.log(`\n=== METAS FAT/XVOL IMPORT COMPLETE ===`);
  console.log(`Inserted: ${inserted} goals`);
  console.log(`Skipped (no rep): ${noRep}`);
  console.log(`Total 2026 goals in DB: ${countResult[0].cnt}`);

  // Verify distribution
  const [dist] = await db.execute(`
    SELECT 
      COUNT(*) as total,
      COUNT(DISTINCT representativeId) as reps,
      COUNT(DISTINCT period) as periods
    FROM goals
    WHERE period LIKE '2026%'
  `);
  console.log(`\nGoals distribution:`);
  console.log(`  Total: ${dist[0].total}`);
  console.log(`  Representatives: ${dist[0].reps}`);
  console.log(`  Periods: ${dist[0].periods}`);

  await db.end();
}

main().catch(console.error);
