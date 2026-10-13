import { spawnSync } from "node:child_process";
const result = spawnSync(
  process.execPath,
  [
    "node_modules/vitest/vitest.mjs",
    "run",
    "infrastructure/src/postgres/postgres.integration.test.ts",
  ],
  { stdio: "inherit", env: { ...process.env, RUN_POSTGRES_TESTS: "1" } },
);
process.exit(result.status ?? 1);
