import { sql } from "drizzle-orm";
import { mysqlTable, varchar, text, boolean, int, timestamp, json } from "drizzle-orm/mysql-core";

// Nouvelle table pour les catégories
export const categories = mysqlTable("categories", {
  id: varchar("id", { length: 255 }).primaryKey(),
  dashboardId: varchar("dashboard_id", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 50 }),
  order: int("order").default(0).notNull(),
  isCollapsed: boolean("is_collapsed").default(false).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
