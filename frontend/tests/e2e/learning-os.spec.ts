import { test, expect } from "@playwright/test";

// These tests require a real authenticated session.
const TEST_EMAIL = process.env.TEST_USER_EMAIL || "";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || "";

test.describe("Learning OS Workspace", () => {
  // We skip if no credentials provided, as the app redirects to /login
  test.skip(!TEST_EMAIL, "Skipped: TEST_USER_EMAIL not set");

  test.beforeEach(async ({ page }) => {
    // Sign in
    await page.goto("/login");
    await page.getByLabel(/email address/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/dashboard|onboarding/, { timeout: 15000 });
  });

  test("Dashboard mode — renders welcome and start button", async ({ page }) => {
    await page.goto("/dashboard");
    
    // Check for the core "Learning OS" branding in Nav
    await expect(page.getByText(/AI personalized learning/i)).toBeVisible();
    
    // Check for Welcome message (for new or returning user)
    await expect(page.getByText(/Welcome/i)).toBeVisible();
    
    // Check for Start Session button (the primary CTA)
    const startButton = page.getByRole("button", { name: /Start/i }).first();
    await expect(startButton).toBeVisible();
  });

  test("Analytics mode — renders trend radar and quiz engine", async ({ page }) => {
    await page.goto("/analytics");
    
    await expect(page.getByText(/AI personalized learning/i)).toBeVisible();
    
    // Check for Trend Radar
    await expect(page.getByText(/trend radar/i)).toBeVisible();
    
    // Check for Quiz Engine
    await expect(page.getByRole("heading", { name: /quiz engine/i })).toBeVisible();
  });

  test("Tutor mode — renders AI Tutor session and Voice controls", async ({ page }) => {
    await page.goto("/session"); // The route is /session for Tutor mode
    
    await expect(page.getByText(/AI personalized learning/i)).toBeVisible();
    
    // Check for AI Tutor panel
    await expect(page.getByRole("heading", { name: /AI Tutor Session/i })).toBeVisible();
    
    // Check for Voice controls
    await expect(page.getByRole("button", { name: /Start Voice/i })).toBeVisible();
  });

  test("Webcam Sentiment panel is toggleable in session", async ({ page }) => {
    await page.goto("/session");
    
    // Find the toggle button
    const toggleBtn = page.getByRole("button", { name: /Start Camera/i });
    await expect(toggleBtn).toBeVisible();
    
    // Initially video might be hidden
    // Click to start
    await toggleBtn.click();
    
    // Now check for video
    await expect(page.locator("video")).toBeVisible({ timeout: 10000 });
  });
});
