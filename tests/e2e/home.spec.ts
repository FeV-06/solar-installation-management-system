import { test, expect } from "@playwright/test";

test.describe("Homepage Smoke Test", () => {
  test("renders the root page with correct title and main heading", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);

    // Verify page document title
    await expect(page).toHaveTitle(/Solar Installation Management System/i);

    // Verify primary heading text
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText("Solar Installation Management System");
  });

  test("displays the initial project scaffold notice without premature feature claims", async ({
    page,
  }) => {
    await page.goto("/");

    // Verify the status notice section is present
    const notice = page.locator("section[aria-labelledby='status-heading']");
    await expect(notice).toBeVisible();

    const noticeHeading = notice.locator("#status-heading");
    await expect(noticeHeading).toHaveText("Project status");
  });
});
