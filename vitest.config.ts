import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["{domain,application,infrastructure,api,web}/src/**/*.test.ts"],
    testTimeout: 15000,
  },
});
