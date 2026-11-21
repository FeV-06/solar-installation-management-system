import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { enquiries } from "@/server/db/schema";

describe("SQLite migrations and enquiry persistence", () => {
  it("migrates once, persists a real enquiry and reads it after reconnect", () => {
    const folder = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), "solar-db-test-"));
    const file = join(folder, "test.db");
    let sqlite: Database.Database | undefined;
    try {
      sqlite = new Database(file);
      const db = drizzle(sqlite);
      migrate(db, { migrationsFolder: "./drizzle" });
      migrate(db, { migrationsFolder: "./drizzle" });
      expect(sqlite.prepare("SELECT count(*) AS count FROM __drizzle_migrations").get()).toEqual({ count: 1 });

      const customerName = `Synthetic ${randomUUID()}`;
      const [created] = db.insert(enquiries).values({
        customerName,
        phone: "0000000000",
        address: "Test site",
        systemType: "ON_GRID",
        capacityKw: 3,
        subsidyInterest: true,
      }).returning().all();
      expect(created.id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(created.createdAt).toBeTruthy();
      sqlite.close();
      sqlite = undefined;

      sqlite = new Database(file);
      const reopened = drizzle(sqlite);
      expect(reopened.select().from(enquiries).where(eq(enquiries.id, created.id)).get()).toMatchObject({
        customerName,
        capacityKw: 3,
        subsidyInterest: true,
      });
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2032-06-12T13:14:15.000Z"));
      reopened.update(enquiries).set({ notes: "Synthetic follow-up" }).where(eq(enquiries.id, created.id)).run();
      expect(reopened.select().from(enquiries).where(eq(enquiries.id, created.id)).get()?.updatedAt)
        .toBe("2032-06-12 13:14:15");
      expect(() => reopened.insert(enquiries).values({
        id: created.id,
        customerName,
        phone: "0000000000",
        address: "Test site",
        systemType: "ON_GRID",
        capacityKw: 3,
      }).run()).toThrow();
    } finally {
      vi.useRealTimers();
      sqlite?.close();
      rmSync(folder, { recursive: true, force: true });
    }
  });
});
