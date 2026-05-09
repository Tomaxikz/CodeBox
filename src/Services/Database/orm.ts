import { drizzle } from "drizzle-orm/bun-sql";
import { db } from "./Database";
import * as schema from "../../Database/schema";

export const orm = drizzle({
  client: db,
  schema,
});
