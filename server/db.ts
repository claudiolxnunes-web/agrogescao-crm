import { eq } from "drizzle-orm";
import { drizzle, MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema";
import { users, InsertUser } from "../drizzle/schema";

type DB = MySql2Database<typeof schema>;

let _db: DB | null = null;
let _pool: mysql.Pool | null = null;

function getMysqlConfig() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 3306,
    user: parsed.username,
    password: parsed.password,
    database: parsed.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

export function getDb(): DB {
  if (!_db) {
    _pool = mysql.createPool(getMysqlConfig());
    _db = drizzle(_pool, { schema, mode: "default" }) as DB;
  }
  return _db;
}

export function getPool() {
  getDb(); // ensure initialized
  return _pool!;
}

export async function getUserByEmail(email: string) {
  const db = getDb();
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0] ?? null;
}

export async function getUserByOpenId(openId: string) {
  const db = getDb();
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0] ?? null;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId && !user.email) {
    throw new Error("User openId or email is required for upsert");
  }
  const db = getDb();
  // Check if user exists
  let existing = null;
  if (user.openId) {
    const res = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
    existing = res[0] ?? null;
  }
  if (!existing && user.email) {
    const res = await db.select().from(users).where(eq(users.email, user.email)).limit(1);
    existing = res[0] ?? null;
  }
  if (existing) {
    await db.update(users)
      .set({
        name: user.name ?? existing.name,
        email: user.email ?? existing.email,
        openId: user.openId ?? existing.openId,
        loginMethod: user.loginMethod ?? existing.loginMethod,
        lastSignedIn: new Date(),
      })
      .where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({
      ...user,
      lastSignedIn: new Date(),
    });
  }
}
