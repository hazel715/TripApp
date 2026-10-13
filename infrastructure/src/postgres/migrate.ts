import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { fileURLToPath } from "node:url";
const pool=new Pool({connectionString:process.env.DATABASE_URL});
try{await migrate(drizzle(pool),{migrationsFolder:fileURLToPath(new URL("./migrations/",import.meta.url))});console.info("Migrations applied")}finally{await pool.end()}
