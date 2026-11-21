import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const enquiries = sqliteTable("Enquiry", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  customerName: text("customerName").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  systemType: text("systemType").notNull(),
  capacityKw: integer("capacityKw").notNull(),
  subsidyInterest: integer("subsidyInterest", { mode: "boolean" }).notNull().default(false),
  notes: text("notes"),
  // TEXT timestamps use SQLite's UTC CURRENT_TIMESTAMP format on insert and update.
  createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdateFn(
    () => new Date().toISOString().slice(0, 19).replace("T", " "),
  ),
});
