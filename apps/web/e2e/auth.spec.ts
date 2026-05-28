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

// Authed flows via the dev bypass (AUTH_BYPASS=1 in the dev env).
test("dev bypass: admin lands on a dashboard with parish, ministries, and lessons", async ({ page }) => {
  await page.goto("/dev/login?email=admin@parvaordo.test");
  await expect(page).toHaveURL("http://localhost:3000/");
  await expect(page.getByRole("heading", { name: /Welcome, Parish Admin/ })).toBeVisible();
  await expect(page.getByText("Holy Spirit Parish")).toBeVisible();
  await expect(page.getByText(/Lessons available to you/)).toBeVisible();
});

test("dev bypass: lesson is a one-item-at-a-time wizard with progress + gating", async ({ page }) => {
  await page.request.get("/dev/reset?email=student@parvaordo.test");
  await page.goto("/dev/login?email=student@parvaordo.test");
  await page.getByRole("link", { name: /Who Do You Say That I Am/ }).click();

  // Step 1/3 — reading
  await expect(page.getByTestId("wizard-step-current")).toHaveText("1");
  await expect(page.getByTestId("wizard-step-total")).toHaveText("3");
  await page.getByTestId("wizard-next").click();

  // Step 2/3 — open-ended question; must answer to advance
  await expect(page.getByTestId("wizard-step-current")).toHaveText("2");
  await page.getByTestId("wizard-answer-input").fill("Jesus is the Christ, the Son of God.");
  await page.getByTestId("wizard-next").click();

  // Step 3/3 — multiple choice
  await expect(page.getByTestId("wizard-step-current")).toHaveText("3");
  await page.getByRole("radio", { name: /Son of the living God/ }).check();
  await page.getByTestId("wizard-next").click();

  // Completion screen
  await expect(page.getByText("Lesson complete")).toBeVisible();
});

test("dev bypass: cannot skip ahead past the first incomplete item", async ({ page }) => {
  await page.request.get("/dev/reset?email=teacher@parvaordo.test");
  await page.goto("/dev/login?email=teacher@parvaordo.test");
  await page.getByRole("link", { name: /Who Do You Say That I Am/ }).click();
  await page.waitForURL(/\/lessons\/[0-9a-f-]+$/); // let the navigation settle before reading the URL
  const lessonPath = new URL(page.url()).pathname;
  await page.goto(`${lessonPath}?step=2`); // tamper — should clamp to the first incomplete step
  await expect(page.getByTestId("wizard-step-current")).toHaveText("1");
});
