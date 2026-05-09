import { bigint, pgTable, primaryKey, timestamp } from "drizzle-orm/pg-core";
import { Users } from "./User";
import { roles } from "./Roles";

export const userRoles = pgTable("user_roles", {

        userId: bigint("user_id", {mode: "number"}).notNull().references(() => Users.id, {onDelete: "cascade"}),
        roleId: bigint("role_Id", {mode: "number"}).notNull().references(() => roles.id, {onDelete: "cascade"}),
        createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow()
    },
    (table) => [
            primaryKey({columns: [table.userId, table.roleId]}),
    ]
)
