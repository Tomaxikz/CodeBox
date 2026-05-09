import { bigserial, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const Users = pgTable("users", {
    id: bigserial("id", {mode: "number"}).primaryKey(),
    username: text("username").notNull().unique(),
    first_name: text("first_name").notNull(),
    last_name: text("last_name").notNull(),
    email: text("email").notNull().unique(),
    password: text("password_hash").notNull(),
    created_at: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
    updated_at: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow()
})