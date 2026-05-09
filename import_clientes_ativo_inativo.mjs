/**
 * import_clientes_ativo_inativo.mjs
 * Importa Clientes_Ativos.xlsx e Clientes_Inativos.xlsx para o banco MySQL
 *
 * Regras:
 * - Status INATIVO = última compra há mais de 6 meses (ou arquivo de inativos)
 * - Inativos NÃO têm representante vinculado — apenas cidade/estado ficam registrados
 * - Upsert pelo código do cliente
 *
 * Uso: node import_clientes_ativo_inativo.mjs [ativos] [inativos]
 */

import "dotenv/config";
import { readFileSync } from "fs";
import { read as xlsxRead, utils as xlsxUtils } from "xlsx";
import mysql from "mysql2/promise";
import path from "path";

const args = process.argv.slice(2);
const ATIVOS_PATH   = args[0] || "./Clientes_Ativos.xlsx";
const INATIVOS_PATH = args[1] || "./Clientes_Inativos.xlsx";

const SEIS_MESES_MS = 6 * 30 * 24 * 60 * 60 * 1000;

// ── Helpers ───────────────────────────────────────────────────────────────────
function mapLinha(linha) {
  if (!linha) return "fazenda_ruminantes";
  const l = linha.toUpperCase();
  if (l.includes("REVENDA")) return "revenda_agropecuaria";
  if (l.includes("AVES") || l.includes("SUINOS") || l.includes("AQUA") || l.includes("PET"))
    return "fabrica_racao";
  return "fazenda_ruminantes";
}

function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === "number") return new Date((val - 25569) * 86400 * 1000);
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function cleanPhone(ddd, tel) {
  const d = ddd ? String(ddd).replace(/\D/g, "") : "";
  const t = tel ? String(tel).replace(/\D/g, "") : "";
  if (!d && !t) return null;
  return d ? `(${d}) ${t}` : t;
}

function isInativo(ultimaCompra) {
  if (!ultimaCompra) return true;
  return (Date.now() - ultimaCompra.getTime()) > SEIS_MESES_MS;
}

// ── Lê e consolida arquivo ────────────────────────────────────────────────────
function readClientes(filePath, fileIsAtivo) {
  console.log(`\n📂 Lendo ${path.basename(filePath)}...`);
  const buf = readFileSync(filePath);
  const wb = xlsxRead(buf, { type: "buffer", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsxUtils.sheet_to_json(ws, { header: 1, defval: null });

  const headers = rows[0].map(h => h ? String(h).trim() : "");
  const dataRows = rows.slice(1).filter(r => r && r[0]);

  const idx = {};
  headers.forEach((h, i) => { idx[h] = i; });

  const get = (row, col) => {
    const i = idx[col];
    return i !== undefined ? row[i] : null;
  };

  const map = new Map();

  for (const row of dataRows) {
    const code = String(get(row, "Cod. Cliente") || "").trim();
    if (!code) continue;

    const linha        = String(get(row, "Linha") || "").trim();
    const fat          = parseFloat(get(row, "Faturamento Realizado Ano")) || 0;
    const ultimaCompra = parseDate(get(row, "Última compra"));

    if (!map.has(code)) {
      map.set(code, {
        clientCode:       code,
        name:             String(get(row, "Cliente") || "").trim(),
        city:             String(get(row, "Municipio") || "").trim() || null,
        state:            String(get(row, "Estado") || "").trim().substring(0, 2).toUpperCase() || null,
        email:            String(get(row, "E-mail") || "").trim() || null,
        phone:            cleanPhone(get(row, "DDD"), get(row, "Telefone")),
        segment:          String(get(row, "Segmento") || "").trim() || null,
        totalPurchases:   0,
        lastPurchaseDate: null,
        productLines:     [],
        type:             "fazenda_ruminantes",
        fileIsAtivo,
      });
    }

    const entry = map.get(code);
    entry.totalPurchases += fat;
    if (linha && !entry.productLines.includes(linha)) entry.productLines.push(linha);
    if (ultimaCompra) {
      if (!entry.lastPurchaseDate || ultimaCompra > entry.lastPurchaseDate)
        entry.lastPurchaseDate = ultimaCompra;
    }
    const t = mapLinha(linha);
    if (t === "revenda_agropecuaria") entry.type = t;
    else if (t === "fabrica_racao" && entry.type !== "revenda_agropecuaria") entry.type = t;
  }

  const result = Array.from(map.values()).map(e => ({
    ...e,
    productLines: e.productLines.join(", "),
    status: (!e.fileIsAtivo || isInativo(e.lastPurchaseDate)) ? "inactive" : "active",
  }));

  const ativos   = result.filter(c => c.status === "active").length;
  const inativos = result.filter(c => c.status === "inactive").length;
  console.log(`  ✅ ${result.length} clientes únicos — ${ativos} ativos, ${inativos} inativos`);
  return result;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const ativos   = readClientes(ATIVOS_PATH, true);
  const inativos = readClientes(INATIVOS_PATH, false);

  // Merge: ativos têm prioridade
  const mergeMap = new Map();
  for (const c of inativos) mergeMap.set(c.clientCode, c);
  for (const c of ativos)   mergeMap.set(c.clientCode, {
    ...(mergeMap.get(c.clientCode) ?? {}),
    ...c,
  });

  const all = Array.from(mergeMap.values());
  const totalAtivos   = all.filter(c => c.status === "active").length;
  const totalInativos = all.filter(c => c.status === "inactive").length;
  console.log(`\n📊 Após merge: ${all.length} clientes — ${totalAtivos} ativos, ${totalInativos} inativos`);

  // Conecta ao banco
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida no .env");
  const parsed = new URL(url);
  const conn = await mysql.createConnection({
    host: parsed.hostname,
    port: parseInt(parsed.port) || 3306,
    user: parsed.username,
    password: parsed.password,
    database: parsed.pathname.slice(1),
    ssl: false,
  });
  console.log("🔌 Conectado ao banco MySQL\n");

  let inserted = 0, updated = 0, errors = 0;

  for (const c of all) {
    try {
      // Sempre sem representante (inativos sem rep, ativos sem coluna ERC no arquivo)
      const repId = null;

      const lastDate = c.lastPurchaseDate
        ? c.lastPurchaseDate.toISOString().slice(0,19).replace("T"," ")
        : null;

      const [existing] = await conn.execute(
        "SELECT id, representativeId FROM clients WHERE clientCode = ?",
        [c.clientCode]
      );

      if (existing.length > 0) {
        // Mantém representante existente se já tinha
        const keepRepId = existing[0].representativeId ?? null;

        await conn.execute(`
          UPDATE clients SET
            name = ?, type = ?, city = ?, state = ?, email = ?, phone = ?,
            segment = ?, status = ?, totalPurchases = ?, lastPurchaseDate = ?,
            productLines = ?, representativeId = ?, updatedAt = NOW()
          WHERE clientCode = ?
        `, [
          c.name, c.type, c.city, c.state, c.email, c.phone,
          c.segment, c.status, c.totalPurchases, lastDate,
          c.productLines, keepRepId, c.clientCode
        ]);
        updated++;
      } else {
        await conn.execute(`
          INSERT INTO clients
            (clientCode, name, type, city, state, email, phone, segment, status,
             totalPurchases, lastPurchaseDate, productLines, representativeId, businessPotential)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `, [
          c.clientCode, c.name, c.type, c.city, c.state, c.email, c.phone,
          c.segment, c.status, c.totalPurchases, lastDate,
          c.productLines, repId
        ]);
        inserted++;
      }

      if ((inserted + updated) % 100 === 0) {
        process.stdout.write(`  ${inserted + updated}/${all.length}...\r`);
      }
    } catch (e) {
      console.error(`\n  ❌ Erro ${c.clientCode}: ${e.message}`);
      errors++;
    }
  }

  await conn.end();
  console.log(`\n✅ Importação concluída!
   Inseridos  : ${inserted}
   Atualizados: ${updated}
   Erros      : ${errors}
   Total      : ${all.length}
  `);
}

main().catch(err => {
  console.error("❌ Erro fatal:", err.message);
  process.exit(1);
});