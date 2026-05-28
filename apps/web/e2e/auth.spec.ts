import { expect, test } from "@playwright/test";

// Hosted AuthKit owns the sign-in screen (external redirect), so E2E covers the
// wiring up to the redirect; the full WorkOS login is verified manually.
test("unauthenticated / redirects to /login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("/login shows a sign-in affordance", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("/sign-in redirects to the WorkOS hosted screen", async ({ page }) => {
  const res = await page.request.get("/sign-in", { maxRedirects: 0 });
  expect(res.status()).toBeGreaterThanOrEqual(300);
  expect(res.status()).toBeLessThan(400);
  expect(res.headers()["location"]).toContain("workos.com");
});
