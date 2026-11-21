import { test, expect } from "@playwright/test";

test.describe("GET /api/health E2E", () => {
  test("returns 200 OK with connected database status envelope via API request", async ({
    request,
  }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);

    // Verify cache control header disables client/CDN caching
    const cacheControl = response.headers()["cache-control"];
    expect(cacheControl).toBeDefined();
    expect(cacheControl).toContain("no-store");

    // Verify response envelope strictly matches data contract
    const body = await response.json();
    expect(body).toEqual({
      data: {
        status: "ok",
        database: "connected",
      },
    });
  });

  test("returns valid health JSON when loaded in a browser context", async ({ page }) => {
    const response = await page.goto("/api/health");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);

    const text = await page.locator("body").innerText();
    const body = JSON.parse(text);
    expect(body).toEqual({
      data: {
        status: "ok",
        database: "connected",
      },
    });
  });
});
