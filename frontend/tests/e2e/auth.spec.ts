import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders hero and feature cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Learn smarter,")).toBeVisible();
    await expect(page.getByText("not harder.")).toBeVisible();
    await expect(page.getByText("Personalised Curriculum")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Voice Tutoring" })).toBeVisible();
    await expect(page.getByText("Smart Adaptation")).toBeVisible();
    await expect(page.getByRole("link", { name: /get started free/i })).toBeVisible();
    await expect(page.locator("main").getByRole("link", { name: /sign in/i })).toBeVisible();
  });

  test("nav links are hidden on landing page for unauthenticated user", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Dashboard" })).not.toBeVisible();
    await expect(page.getByRole("link", { name: "Courses" })).not.toBeVisible();
  });
});

test.describe("Login page", () => {
  test("renders login form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("shows error on wrong credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email address/i).fill("wrong@example.com");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/incorrect email or password/i)).toBeVisible({ timeout: 8000 });
  });

  test("navigates to register page", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /create one free/i }).click();
    await expect(page).toHaveURL(/register/);
  });

  test("unauthenticated user is redirected from dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/, { timeout: 5000 });
  });
});

test.describe("Register page", () => {
  test("renders registration form", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
  });

  test("shows error when passwords do not match", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel(/email address/i).fill("test@example.com");
    await page.getByLabel(/^password$/i).fill("password123");
    await page.getByLabel(/confirm password/i).fill("different123");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test("shows error when password is too short", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel(/email address/i).fill("test@example.com");
    await page.getByLabel(/^password$/i).fill("short");
    await page.getByLabel(/confirm password/i).fill("short");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });

  test("navigates to login page", async ({ page }) => {
    await page.goto("/register");
    await page.locator("main").getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/login/, { timeout: 10000 });
  });
});

test.describe("Protected routes", () => {
  const protectedRoutes = ["/dashboard", "/tutor", "/analytics", "/learn"];

  for (const route of protectedRoutes) {
    test(`${route} redirects unauthenticated users to login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/login/, { timeout: 10000 });
    });
  }
});
