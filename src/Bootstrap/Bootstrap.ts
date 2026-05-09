import { CsrfMiddleware } from "../Middlewares/CSRFMiddleware";
import { testDatabaseConnection } from "../Services/Database/Database";
import { migrateUp } from "../Services/Database/Migration";
import { logger } from "../Services/Logger/LoggerService";
import { MailService } from "../Services/Mail/MailService";
import { authRouter } from "../router/api-auth";
import { Router } from "../router/type";
import { SeedDefaultPermissions } from "./Seeders/SeedDefaultPermissions";
import { SeedDefaultRoles } from "./Seeders/SeedDefaultRoles";

export class Bootstrap {
    public static async bootstrap() {
        this.banner()
        await this.database();
        await this.enabledRouters();
        await SeedDefaultRoles.seed();
        await MailService.verifyConnection();
        await SeedDefaultPermissions.seed();
    }

    private static async enabledRouters() {
        try {
            Router.group("/api", () => {
                Router.use("*", CsrfMiddleware.handle);
                logger.info("CSRF middleware enabled for /api/*");

                authRouter();
            });

            logger.info("Auth routes registered successfully");
        } catch (error) {
            logger.error(
                error instanceof Error
                ? `Failed to register auth routes: ${error.stack ?? error.message}`
                : `Failed to register auth routes: ${String(error)}`,
            );

            process.exit(1);
        }
    }

    private static async database() {
        try {
        await testDatabaseConnection();
        await migrateUp();

        logger.info("Database is ready");
        } catch (error) {
        logger.error(
            error instanceof Error
            ? `Database startup failed: ${error.stack ?? error.message}`
            : `Database startup failed: ${String(error)}`,
        );

        process.exit(1);
        }
    }
    private static banner() {
        const version = Bun.env.APP_VERSION ?? "Unknown";
        const green = "\x1b[32m";
        const cyan = "\x1b[36m";
        const yellow = "\x1b[33m";
        const gray = "\x1b[90m";
        const reset = "\x1b[0m";

        logger.info(`
    ${green}
    ██████╗ ██████╗ ██████╗ ███████╗██████╗  ██████╗ ██╗  ██╗
    ██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔══██╗██╔═══██╗╚██╗██╔╝
    ██║     ██║   ██║██║  ██║█████╗  ██████╔╝██║   ██║ ╚███╔╝ 
    ██║     ██║   ██║██║  ██║██╔══╝  ██╔══██╗██║   ██║ ██╔██╗ 
     ╚██████╗╚██████╔╝██████╔╝███████╗██████╔╝╚██████╔╝██╔╝ ██╗
     ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═════╝  ╚═════╝ ╚═╝  ╚═╝
    ${reset}
    ${gray}Developed by:${reset} Tomaxikz aka Tomáš Labanc
    ${gray}Version:${reset} ${version}
        `);
    }
}
