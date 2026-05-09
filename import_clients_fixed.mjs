import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
import * as XLSX from 'xlsx';

config();

const ATIVOS_FILE = '/home/ubuntu/upload/ClientesAtivos02.2026.xlsx';
const INATIVOS_FILE = '/home/ubuntu/upload/ClientesInativos02.2026.xlsx';

async function main() {
  const db = await mysql.createConnection(process.env.DATABASE_URL);

  console.log("=== IMPORTAÇÃO CORRIGIDA DE CLIENTES ===\n");

  // Load representatives from DB
  const [reps] = await db.execute("SELECT id, repCode, name FROM representatives");
  const repByCode = {};
  const repByName = {};
  for (const r of reps) {
    repByCode[String(r.repCode).padStart(6, '0')] = r;
    repByName[String(r.name).trim().toUpperCase()] = r;
  }

  // Track existing clients by clientCode
  const [existing] = await db.execute("SELECT id, clientCode FROM clients WHERE clientCode IS NOT NULL");
  const existingByCode = {};
  for (const c of existing) {
    existingByCode[String(c.clientCode).trim()] = c.id;
  }

  console.log(`Representatives loaded: ${reps.length}`);
  console.log(`Existing clients: ${existing.length}\n`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  // ============================================================
  // IMPORTAR CLIENTES ATIVOS
  // ============================================================
  console.log("--- CLIENTES ATIVOS ---");
  const wbAtivos = XLSX.read(readFileSync(ATIVOS_FILE));
  const wsAtivos = wbAtivos.Sheets[wbAtivos.SheetNames[0]];
  const rowsAtivos = XLSX.utils.sheet_to_json(wsAtivos, { header: 1, defval: null });

  for (let i = 1; i < rowsAtivos.length; i++) {
    const row = rowsAtivos[i];
    if (!row || !row[0]) continue;

    const clientCode = String(row[0]).trim();
    const clientName = String(row[1] || '').trim();
    const faturamento = parseFloat(row[2]) || 0;
    const linha = String(row[3] || '').trim();
    const segmento = String(row[4] || '').trim();
    const municipio = String(row[5] || '').trim();
    const estado = String(row[6] || '').trim();
    const email = String(row[7] || '').trim();
    const ddd = String(row[8] || '').trim();
    const telefone = String(row[9] || '').trim();
    const ultimaCompra = row[10];

    const phone = (ddd + telefone).replace(/\D/g, '');

    // Converter data para formato ISO se necessário
    let ultimaCompraFormatted = null;
    if (ultimaCompra) {
      if (typeof ultimaCompra === 'number') {
        // Excel serial number
        const excelDate = new Date((ultimaCompra - 25569) * 86400 * 1000);
        ultimaCompraFormatted = excelDate.toISOString().split('T')[0];
      } else if (typeof ultimaCompra === 'string') {
        ultimaCompraFormatted = ultimaCompra.split(' ')[0];
      }
    }

    // Verificar se cliente já existe
    const existingId = existingByCode[clientCode];

    if (existingId) {
      // Atualizar: apenas email, phone, última compra (não sobrescrever representante)
      await db.execute(
        `UPDATE clients 
         SET email = ?, phone = ?, lastPurchaseDate = ?, status = 'active'
         WHERE id = ?`,
        [email || null, phone || null, ultimaCompraFormatted, existingId]
      );
      updated++;
    } else {
      // Inserir novo cliente
      await db.execute(
        `INSERT INTO clients (clientCode, name, email, phone, city, state, segment, status, lastPurchaseDate, totalPurchases, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, NOW(), NOW())`,
        [clientCode, clientName, email || null, phone || null, municipio, estado, linha, ultimaCompraFormatted, faturamento]
      );
      inserted++;
      existingByCode[clientCode] = 1; // Mark as imported
    }
  }

  console.log(`Ativos processados: ${inserted} inseridos, ${updated} atualizados\n`);

  // ============================================================
  // IMPORTAR CLIENTES INATIVOS
  // ============================================================
  console.log("--- CLIENTES INATIVOS ---");
  const wbInativos = XLSX.read(readFileSync(INATIVOS_FILE));
  const wsInativos = wbInativos.Sheets[wbInativos.SheetNames[0]];
  const rowsInativos = XLSX.utils.sheet_to_json(wsInativos, { header: 1, defval: null });

  let inativosInserted = 0;
  let inativosUpdated = 0;
  let inativosSkipped = 0;

  for (let i = 1; i < rowsInativos.length; i++) {
    const row = rowsInativos[i];
    if (!row || !row[0]) continue;

    const clientCode = String(row[0]).trim();
    const clientName = String(row[1] || '').trim();
    const faturamento = parseFloat(row[2]) || 0;
    const ercRaw = String(row[3] || '').trim(); // "001370 - CAROLINA PIERONI - SANTA TEREZA REP. COM"
    const linha = String(row[4] || '').trim();
    const segmento = String(row[5] || '').trim();
    const municipio = String(row[6] || '').trim();
    const estado = String(row[7] || '').trim();
    const email = String(row[8] || '').trim();
    const ddd = String(row[9] || '').trim();
    const telefone = String(row[10] || '').trim();
    const ultimaCompra = row[11];

    const phone = (ddd + telefone).replace(/\D/g, '');

    // Converter data para formato ISO se necessário
    let ultimaCompraFormatted = null;
    if (ultimaCompra) {
      if (typeof ultimaCompra === 'number') {
        // Excel serial number
        const excelDate = new Date((ultimaCompra - 25569) * 86400 * 1000);
        ultimaCompraFormatted = excelDate.toISOString().split('T')[0];
      } else if (typeof ultimaCompra === 'string') {
        ultimaCompraFormatted = ultimaCompra.split(' ')[0];
      }
    }

    // Extrair código do representante do ERC
    let representativeId = null;
    if (ercRaw) {
      const ercCode = ercRaw.split('-')[0].trim();
      const ercCodePadded = ercCode.padStart(6, '0');
      if (repByCode[ercCodePadded]) {
        representativeId = repByCode[ercCodePadded].id;
      }
    }

    // Verificar se cliente já existe
    const existingId = existingByCode[clientCode];

    if (existingId) {
      // Atualizar: email, phone, representante, última compra, status
      await db.execute(
        `UPDATE clients 
         SET email = ?, phone = ?, representativeId = ?, lastPurchaseDate = ?, status = 'inactive'
         WHERE id = ?`,
        [email || null, phone || null, representativeId, ultimaCompraFormatted, existingId]
      );
      inativosUpdated++;
    } else {
      // Inserir novo cliente
      await db.execute(
        `INSERT INTO clients (clientCode, name, email, phone, city, state, segment, representativeId, status, lastPurchaseDate, totalPurchases, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'inactive', ?, ?, NOW(), NOW())`,
        [clientCode, clientName, email || null, phone || null, municipio, estado, linha, representativeId, ultimaCompraFormatted, faturamento]
      );
      inativosInserted++;
      existingByCode[clientCode] = 1; // Mark as imported
    }
  }

  console.log(`Inativos processados: ${inativosInserted} inseridos, ${inativosUpdated} atualizados\n`);

  // ============================================================
  // RESUMO FINAL
  // ============================================================
  const [finalStats] = await db.execute(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as ativos,
      SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inativos,
      SUM(CASE WHEN email IS NOT NULL AND email != '' THEN 1 ELSE 0 END) as com_email,
      SUM(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 ELSE 0 END) as com_phone,
      SUM(CASE WHEN representativeId IS NOT NULL THEN 1 ELSE 0 END) as com_representante
    FROM clients
  `);

  const stats = finalStats[0];
  console.log("=== RESUMO FINAL ===");
  console.log(`Total inseridos: ${inserted + inativosInserted}`);
  console.log(`Total atualizados: ${updated + inativosUpdated}`);
  console.log(`\nBase de dados agora contém:`);
  console.log(`  Total: ${stats.total} clientes`);
  console.log(`  Ativos: ${stats.ativos}`);
  console.log(`  Inativos: ${stats.inativos}`);
  console.log(`  Com email: ${stats.com_email} (${(stats.com_email / stats.total * 100).toFixed(1)}%)`);
  console.log(`  Com telefone: ${stats.com_phone} (${(stats.com_phone / stats.total * 100).toFixed(1)}%)`);
  console.log(`  Com representante: ${stats.com_representante} (${(stats.com_representante / stats.total * 100).toFixed(1)}%)`);

  await db.end();
}

main().catch(console.error);
