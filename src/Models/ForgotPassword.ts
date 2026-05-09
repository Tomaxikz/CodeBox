import { bigint, bigserial, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { Users } from "./User";

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: bigserial("id", { mode: "number" }).primaryKey(),

  userId: bigint("user_id", { mode: "number" })
    .notNull()
    .references(() => Users.id, { onDelete: "cascade" }),

  tokenHash: text("token_hash").notNull().unique(),

  usedAt: timestamp("used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});