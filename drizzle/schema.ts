import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core"

export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  state: text("state").$type<"available" | "in-use" | "inactive">().notNull(),
  createdAt: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
})

export type Device = typeof devices.$inferSelect
export type NewDevice = Omit<Device, "id" | "createdAt">
