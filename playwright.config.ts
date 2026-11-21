import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT || "3109";
const HOST = "127.0.0.1";
const BASE_URL = `http://${HOST}:${PORT}`;

// Test DB isolation advisory: Ensure the child dev server inherits the isolated test database
if (!process.env.DATABASE_URL) {
  console.warn(
    "[playwright.config] Notice: process.env.DATABASE_URL is not explicitly set.\n" +
      "  For test DB isolation, supply DATABASE_URL when invoking e2e tests, e.g.:\n" +
      "  DATABASE_URL=\"file:./test.db\" pnpm test:e2e\n" +
      "  The dev server webServer inherits process.env.\n",
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      PORT,
    },
  },
});
