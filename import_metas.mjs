import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
import * as XLSX from 'xlsx';

config();

const METAS_FILE = '/home/ubuntu/upload/CópiadeMetas2026-RegionalSuldeGoiás,NoroesteeAltoParanaíba-MG.xlsx';

// Month names to numbers
const MONTHS = {
  JANEIRO: 1, FEVEREIRO: 2, MARCO: 3, ABRIL: 4, MAIO: 5, JUNHO: 6,
  JULHO: 7, AGOSTO: 8, SETEMBRO: 9, OUTUBRO: 10, NOVEMBRO: 11, DEZEMBRO: 12
};

async function main() {
  const db = await mysql.createConnection(process.env.DATABASE_URL);

  // Load representatives from DB
  const [reps] = await db.execute("SELECT id, repCode, name FROM representatives");
  const repByCode = {};
  for (const r of reps) {
    repByCode[String(r.repCode).trim()] = r;
  }

  // Read Excel file
  const wb = XLSX.read(readFileSync(METAS_FILE));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  const headers = rows[0]; // CODIGO, REPRESENTANTE, CODESP, ESPECIE, CODSUBSO, SUBSOLUCAO, CODSOL, SOLUCAO, %, TOTAL, JANEIRO...DEZEMBRO

  let inserted = 0;
  let skipped = 0;
  let noRep = 0;

  for (let i = 1; i < rows.length; i++) {
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
    // The file uses codes like '1234' but DB has '001234'
    let repCodePadded = codigo.padStart(6, '0');
    let rep = repByCode[repCodePadded] || repByCode[codigo];

    if (!rep) {
      // Try to find by name
      const repNameClean = String(repName).trim().toUpperCase();
      rep = reps.find(r => String(r.name).trim().toUpperCase().includes(repNameClean.substring(0, 15)));
    }

    if (!rep) {
      console.log(`  No rep found for code=${codigo}, name=${repName}`);
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

    // Insert monthly goals for detail rows
    if (!isTotal) {
      const monthCols = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
      for (let m = 0; m < 12; m++) {
        const colIdx = 10 + m; // columns 10-21 are months
        const monthVal = parseFloat(row[colIdx]) || 0;
        if (monthVal > 0) {
          const monthNum = String(m + 1).padStart(2, '0');
          const period = `2026-${monthNum}`;
          const monthName = monthCols[m];
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

  const [countResult] = await db.execute("SELECT COUNT(*) as cnt FROM goals");
  console.log(`\n=== METAS IMPORT COMPLETE ===`);
  console.log(`Inserted: ${inserted} goals`);
  console.log(`Skipped (no rep): ${noRep}`);
  console.log(`Total goals in DB: ${countResult[0].cnt}`);

  await db.end();
}

main().catch(console.error);
