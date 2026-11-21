import "server-only";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required; see .env.example");
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

const globalForDb = globalThis as unknown as { prisma?: PrismaClient };
export const db = globalForDb.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb.prisma = db;
