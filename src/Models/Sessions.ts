import { bigint, bigserial, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { Users } from "./User";

export const sessions = pgTable("sessions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),

  userId: bigint("user_id", { mode: "number" })
    .notNull()
    .references(() => Users.id, { onDelete: "cascade" }),

  deviceIdHash: text("device_id_hash").notNull(),
  tokenHash: text("token_hash").notNull().unique(),

  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),

  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
