import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
import * as XLSX from 'xlsx';

config();

const ATIVOS_FILE = '/home/ubuntu/upload/ClientesAtivos02.2026.xlsx';
const INATIVOS_FILE = '/home/ubuntu/upload/ClientesInativos02.2026.xlsx';

// Map segment letter to type
function mapType(linha) {
  const l = String(linha || '').toUpperCase();
  if (l.includes('RUMINANTE') || l.includes('BOVINO') || l.includes('NUTRICAO')) return 'fazenda_ruminantes';
  if (l.includes('RACAO') || l.includes('FABRICA')) return 'fabrica_racao';
  if (l.includes('REVENDA') || l.includes('AGROPEC')) return 'revenda_agropecuaria';
  return 'fazenda_ruminantes'; // default
}

function cleanPhone(ddd, tel) {
  const d = String(ddd || '').replace(/\D/g, '');
  const t = String(tel || '').replace(/\D/g, '');
  if (!t) return null;
  if (d) return `(${d}) ${t}`;
  return t;
}

function cleanEmail(email) {
  if (!email) return null;
  // Take first email if multiple separated by semicolons
  const first = String(email).split(';')[0].trim();
  return first || null;
}

async function importClients(db, filePath, status) {
  const wb = XLSX.read(readFileSync(filePath));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  const headers = rows[0];
  console.log(`\nImporting ${status} clients from ${filePath}`);
  console.log(`  Headers: ${headers.join(', ')}`);

  // Detect column positions
  const isInativo = status === 'inactive';
  // Ativos: Cod.Cliente, Cliente, Faturamento, Linha, Segmento, Municipio, Estado, Email, DDD, Telefone, Última compra
  // Inativos: Cod.Cliente, Cliente, Faturamento, ERC, Linha, Segmento, Municipio, Estado, Email, DDD, Telefone, Última compra
  const COL = isInativo ? {
    code: 0, name: 1, faturamento: 2, erc: 3, linha: 4, segmento: 5,
    municipio: 6, estado: 7, email: 8, ddd: 9, telefone: 10, ultimaCompra: 11
  } : {
    code: 0, name: 1, faturamento: 2, linha: 3, segmento: 4,
    municipio: 5, estado: 6, email: 7, ddd: 8, telefone: 9, ultimaCompra: 10
  };

  // Load representatives for ERC matching
  const [reps] = await db.execute("SELECT id, repCode, name FROM representatives");
  const repByCode = {};
  for (const r of reps) {
    repByCode[String(r.repCode).trim()] = r;
  }

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[COL.code]) continue;

    const clientCode = String(row[COL.code]).trim();
    const name = String(row[COL.name] || '').trim();
    if (!name) continue;

    const faturamento = parseFloat(row[COL.faturamento]) || 0;
    const linha = row[COL.linha] || '';
    const segmento = row[COL.segmento] || '';
    const municipio = String(row[COL.municipio] || '').trim();
    const estado = String(row[COL.estado] || '').trim().toUpperCase().substring(0, 2);
    const email = cleanEmail(row[COL.email]);
    const phone = cleanPhone(row[COL.ddd], row[COL.telefone]);
    // Handle Excel serial dates (numbers) or JS Date objects
    let ultimaCompra = null;
    const rawDate = row[COL.ultimaCompra];
    if (rawDate) {
      if (typeof rawDate === 'number') {
        // Excel serial date: days since 1899-12-30
        const excelEpoch = new Date(1899, 11, 30);
        ultimaCompra = new Date(excelEpoch.getTime() + rawDate * 86400000);
      } else {
        ultimaCompra = new Date(rawDate);
      }
      // Validate date is reasonable (after 2000)
      if (isNaN(ultimaCompra.getTime()) || ultimaCompra.getFullYear() < 2000) {
        ultimaCompra = null;
      }
    }
    const clientType = mapType(linha);

    // Find representative from ERC (only for inativos)
    let representativeId = null;
    if (isInativo && row[COL.erc]) {
      const ercStr = String(row[COL.erc]).trim();
      // ERC format: "001370 - CAROLINA PIERONI..."
      const ercCode = ercStr.split(' - ')[0].trim();
      const rep = repByCode[ercCode];
      if (rep) representativeId = rep.id;
    }

    try {
      // Check if client exists by clientCode
      const [existing] = await db.execute(
        "SELECT id, status FROM clients WHERE clientCode = ?",
        [clientCode]
      );

      if (existing.length > 0) {
        // Update existing client
        const updateFields = {
          name,
          status,
          city: municipio || null,
          state: estado || null,
          email,
          phone,
          totalPurchases: faturamento,
          segment: segmento || null,
          lastPurchaseDate: ultimaCompra,
          updatedAt: new Date()
        };
        if (representativeId) updateFields.representativeId = representativeId;

        await db.execute(
          `UPDATE clients SET name=?, status=?, city=?, state=?, email=?, phone=?,
           totalPurchases=?, segment=?, lastPurchaseDate=?, updatedAt=NOW()
           ${representativeId ? ', representativeId=?' : ''}
           WHERE clientCode=?`,
          representativeId
            ? [name, status, municipio || null, estado || null, email, phone, faturamento, segmento || null, ultimaCompra, representativeId, clientCode]
            : [name, status, municipio || null, estado || null, email, phone, faturamento, segmento || null, ultimaCompra, clientCode]
        );
        updated++;
      } else {
        // Insert new client
        await db.execute(
          `INSERT INTO clients (clientCode, name, type, email, phone, city, state, totalPurchases, segment, status, lastPurchaseDate, representativeId, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [clientCode, name, clientType, email, phone, municipio || null, estado || null, faturamento, segmento || null, status, ultimaCompra, representativeId]
        );
        inserted++;
      }
    } catch (err) {
      console.error(`  Error on row ${i} (${clientCode} - ${name}): ${err.message}`);
      errors++;
    }
  }

  console.log(`  Results: +${inserted} new, ${updated} updated, ${errors} errors`);
  return { inserted, updated, errors };
}

async function main() {
  const db = await mysql.createConnection(process.env.DATABASE_URL);

  const ativosResult = await importClients(db, ATIVOS_FILE, 'active');
  const inativosResult = await importClients(db, INATIVOS_FILE, 'inactive');

  const [countResult] = await db.execute("SELECT status, COUNT(*) as cnt FROM clients GROUP BY status");
  console.log("\n=== CLIENTS IMPORT COMPLETE ===");
  console.log("Clients by status:");
  for (const r of countResult) {
    console.log(`  ${r.status}: ${r.cnt}`);
  }
  const [total] = await db.execute("SELECT COUNT(*) as cnt FROM clients");
  console.log(`  TOTAL: ${total[0].cnt}`);

  await db.end();
}

main().catch(console.error);
