import "server-only";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/server/db/schema";

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url?.startsWith("file:") || url.length === "file:".length) {
    throw new Error("DATABASE_URL must be a non-empty file: SQLite URL; see .env.example");
  }
  // Opening the health endpoint must not silently create a missing, unmigrated DB.
  const sqlite = new Database(url.slice("file:".length), { fileMustExist: true });
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

const globalForDb = globalThis as unknown as { db?: ReturnType<typeof createClient> };
export const db = globalForDb.db ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb.db = db;
