import { bigserial, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const roles = pgTable("roles", {
    id: bigserial("id", {mode: "number"}).primaryKey(),
    name: text("name").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})