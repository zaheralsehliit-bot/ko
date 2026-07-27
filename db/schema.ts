import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const financeMovements = sqliteTable("finance_movements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  accountName: text("account_name").notNull(),
  category: text("category").notNull(),
  amount: integer("amount").notNull(),
  direction: text("direction", { enum: ["in", "out"] }).notNull(),
  paymentMethod: text("payment_method").notNull().default("نقدي"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
