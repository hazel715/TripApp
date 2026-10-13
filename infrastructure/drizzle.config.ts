import { defineConfig } from "drizzle-kit";
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/postgres/schema.ts",
  out: "./src/postgres/migrations",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgres://tripapp:tripapp@localhost:5432/tripapp",
  },
});
