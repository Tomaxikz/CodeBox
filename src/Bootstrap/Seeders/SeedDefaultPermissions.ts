

import { orm } from "../../Services/Database/orm";
import { logger } from "../../Services/Logger/LoggerService";
import { permissions as permissionsTable } from "../../Models/Permissions";
import { permissions as permissionSeeds } from "../../Models/Static/Permissions";

export class SeedDefaultPermissions {
  public static async seed() {
    try {
      for (const permission of permissionSeeds) {
        await orm
            .insert(permissionsTable)
            .values({
                name: permission.name,
                description: permission.description,
            })
            .onConflictDoUpdate({
                target: permissionsTable.name,
                set: {
                description: permission.description,
                updatedAt: new Date(),
            },
         });
      }

      logger.info("Default permissions seed completed successfully");
    } catch (error) {
      logger.error(String(error));
    }
  }
}