import mysql from "mysql2/promise";

const BRAZIL_STATES = [
  { code: "AC", name: "Acre" },
  { code: "AL", name: "Alagoas" },
  { code: "AP", name: "Amapá" },
  { code: "AM", name: "Amazonas" },
  { code: "BA", name: "Bahia" },
  { code: "CE", name: "Ceará" },
  { code: "DF", name: "Distrito Federal" },
  { code: "ES", name: "Espírito Santo" },
  { code: "GO", name: "Goiás" },
  { code: "MA", name: "Maranhão" },
  { code: "MT", name: "Mato Grosso" },
  { code: "MS", name: "Mato Grosso do Sul" },
  { code: "MG", name: "Minas Gerais" },
  { code: "PA", name: "Pará" },
  { code: "PB", name: "Paraíba" },
  { code: "PR", name: "Paraná" },
  { code: "PE", name: "Pernambuco" },
  { code: "PI", name: "Piauí" },
  { code: "RJ", name: "Rio de Janeiro" },
  { code: "RN", name: "Rio Grande do Norte" },
  { code: "RS", name: "Rio Grande do Sul" },
  { code: "RO", name: "Rondônia" },
  { code: "RR", name: "Roraima" },
  { code: "SC", name: "Santa Catarina" },
  { code: "SP", name: "São Paulo" },
  { code: "SE", name: "Sergipe" },
  { code: "TO", name: "Tocantins" },
];

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const parsed = new URL(url);
const conn = await mysql.createConnection({
  host: parsed.hostname,
  port: parseInt(parsed.port) || 3306,
  user: parsed.username,
  password: parsed.password,
  database: parsed.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

console.log("Connected to database");

// Get existing regions
const [existing] = await conn.query("SELECT code FROM regions");
const existingCodes = new Set(existing.map(r => r.code));
console.log("Existing regions:", [...existingCodes].join(", "));

let inserted = 0;
for (const state of BRAZIL_STATES) {
  if (!existingCodes.has(state.code)) {
    await conn.query(
      "INSERT INTO regions (name, code, createdAt) VALUES (?, ?, NOW())",
      [state.name, state.code]
    );
    console.log(`  Added: ${state.code} - ${state.name}`);
    inserted++;
  } else {
    // Update name if different
    await conn.query(
      "UPDATE regions SET name = ? WHERE code = ?",
      [state.name, state.code]
    );
  }
}

console.log(`\nDone! Inserted ${inserted} new states.`);
const [final] = await conn.query("SELECT code, name FROM regions ORDER BY name");
console.log("All regions:", final.map(r => `${r.code}=${r.name}`).join(", "));

await conn.end();
