import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;
if (!url?.startsWith("file:") || url.length === "file:".length) {
  throw new Error("DATABASE_URL must be a non-empty file: SQLite URL; see .env.example");
}

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  strict: true,
});
