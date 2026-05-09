import { roles } from "../../Models/Roles";
import { orm } from "../../Services/Database/orm";
import { logger } from "../../Services/Logger/LoggerService";

type default_roles = "Admin" | "Teacher" | "Student" 
type DefaultRoleSeed = {
    name: default_roles,
}

export class SeedDefaultRoles {
    private static defaultRoles: DefaultRoleSeed[] = [
        { name: "Admin" },
        { name: "Teacher" },
        { name: "Student" },
    ] ;

    public static async seed() {
        try {
            for (const role of this.defaultRoles) {
                const inserted = await orm.insert(roles)
                .values({
                    name: role.name
                })
                .onConflictDoNothing({
                    target: roles.name,
                })
                .returning();
                
                if (inserted.length > 0) {
                    logger.info(`Seeded role: ${role.name}`);
                } else {
                    logger.debug(`Role already exists: ${role.name}`);
                }
            } 
        }  catch (error) {
            logger.error(String(error))
        }
    }

}