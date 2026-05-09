import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
import * as XLSX from 'xlsx';

config();

const FILES = [
  '/home/ubuntu/upload/data(68).xlsx',
  '/home/ubuntu/upload/data(69).xlsx'
];

function str(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s === '' || s === 'null' || s === 'undefined' ? null : s;
}

function col(row, ...keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) return row[k];
  }
  return null;
}

async function main() {
  const db = await mysql.createConnection(process.env.DATABASE_URL);

  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const filePath of FILES) {
    console.log(`\nProcessing: ${filePath}`);
    const wb = XLSX.read(readFileSync(filePath));
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: null });

    let fileUpdated = 0;
    let fileSkipped = 0;

    for (const row of rows) {
      const invoiceNumber = str(col(row, 'Nota Fiscal', 'NOTA FISCAL'));
      const clientCode = str(col(row, 'Cód. Cliente', 'Cod. Cliente', 'COD. CLIENTE'));
      const productCode = str(col(row, 'Cód. Produto', 'Cod. Produto', 'COD. PRODUTO'));
      const uf = str(col(row, 'UF', 'uf', 'Estado', 'ESTADO'));
      const municipio = str(col(row, 'Município', 'Municipio', 'MUNICÍPIO'));
      const regiao = str(col(row, 'Região', 'Regiao', 'REGIÃO'));

      if (!invoiceNumber || !clientCode || !productCode) continue;
      if (!uf && !municipio && !regiao) {
        fileSkipped++;
        continue;
      }

      const [result] = await db.execute(
        `UPDATE sales_invoices SET uf=?, municipio=?, regiao=? 
         WHERE invoiceNumber=? AND clientCode=? AND productCode=?`,
        [uf, municipio, regiao, invoiceNumber, clientCode, productCode]
      );

      if (result.affectedRows > 0) {
        fileUpdated++;
      } else {
        fileSkipped++;
      }
    }

    console.log(`  Updated: ${fileUpdated}, Skipped: ${fileSkipped}`);
    totalUpdated += fileUpdated;
    totalSkipped += fileSkipped;
  }

  // Also update clients table with state from sales_invoices
  // (clients imported from ClientesAtivos already have state, but let's verify)
  
  // Final check
  const [geoCheck] = await db.execute(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN uf IS NOT NULL AND uf != '' THEN 1 ELSE 0 END) as with_uf,
      SUM(CASE WHEN municipio IS NOT NULL AND municipio != '' THEN 1 ELSE 0 END) as with_municipio,
      SUM(CASE WHEN regiao IS NOT NULL AND regiao != '' THEN 1 ELSE 0 END) as with_regiao
    FROM sales_invoices
  `);

  console.log(`\n=== GEO UPDATE COMPLETE ===`);
  console.log(`Total updated: ${totalUpdated}`);
  console.log(`Total skipped: ${totalSkipped}`);
  console.log(`\nSales invoices geographic coverage:`);
  console.log(`  Total: ${geoCheck[0].total}`);
  console.log(`  With UF: ${geoCheck[0].with_uf} (${Math.round(geoCheck[0].with_uf/geoCheck[0].total*100)}%)`);
  console.log(`  With Municipio: ${geoCheck[0].with_municipio} (${Math.round(geoCheck[0].with_municipio/geoCheck[0].total*100)}%)`);
  console.log(`  With Regiao: ${geoCheck[0].with_regiao} (${Math.round(geoCheck[0].with_regiao/geoCheck[0].total*100)}%)`);

  // UF distribution
  const [ufDist] = await db.execute(`
    SELECT uf, COUNT(*) as cnt FROM sales_invoices 
    WHERE uf IS NOT NULL AND uf != '' 
    GROUP BY uf ORDER BY cnt DESC
  `);
  console.log(`\nUF distribution:`);
  for (const r of ufDist) {
    console.log(`  ${r.uf}: ${r.cnt}`);
  }

  await db.end();
}

main().catch(console.error);
