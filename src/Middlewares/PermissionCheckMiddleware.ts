import type { Context, Next } from "hono";
import { eq } from "drizzle-orm";

import { orm } from "../Services/Database/orm";
import { permissions } from "../Models/Permissions";
import { rolePermissions } from "../Models/rolePermissions";
import { roles } from "../Models/Roles";
import { userRoles } from "../Models/userRoles";

export class PermissionCheckMiddleware {
  public static can(permissionName: string) {
    return async (c: Context, next: Next) => {
      const user = c.get("user");

      if (!user) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const hasPermission = await this.userHasPermission(user.id, permissionName);

      if (!hasPermission) {
        return c.json({ message: "Forbidden" }, 403);
      }

      await next();
    };
  }

  private static async userHasPermission(userId: number, permissionName: string) {
    const rows = await orm
      .select({
        permissionName: permissions.name,
      })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(eq(userRoles.userId, userId));

    return rows.some((row) => row.permissionName === permissionName);
  }
}