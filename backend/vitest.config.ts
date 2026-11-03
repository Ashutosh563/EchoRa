import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Tests live only in backend/tests/{unit,integration}; mocks/ holds fixtures.
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    restoreMocks: true,
  },
});

