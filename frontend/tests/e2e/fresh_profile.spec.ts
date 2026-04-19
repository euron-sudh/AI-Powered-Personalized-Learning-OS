import { test, expect } from '@playwright/test';

test.describe('Fresh Profile Creation and Navigation E2E', () => {
  // Use a unique email for every test run to ensure a fresh profile
  const uniqueEmail = `e2e_fresh_${Date.now()}@example.com`;
  const password = 'Password123!';

  test('should create a fresh profile, select 5 subjects, and navigate all tabs', async ({ page }) => {
    // Increase timeout for curriculum generation
    test.setTimeout(120000); 

    // 1. Sign Up
    await page.goto('http://localhost:3000/register');
    
    await page.fill('input[id="email"]', uniqueEmail);
    await page.fill('input[id="password"]', password);
    await page.fill('input[id="confirm"]', password);
    await page.getByRole('button', { name: /create account/i }).click();

    // If email confirmation is required, it will stay on the page. We will assume auto-confirm is on for local dev.
    // 2. Onboarding - Step 1: Info
    await page.waitForURL('**/onboarding*');
    await page.fill('input[placeholder="e.g. Alex"]', 'E2E Tester');
    await page.locator('select').selectOption({ index: 9 }); // Grade 8 or similar
    await page.getByRole('button', { name: /next/i }).click();

    // 3. Onboarding - Step 2: Board
    // Assuming there are buttons or cards for boards. The Next button works.
    await page.getByText(/CBSE/i).click();
    await page.getByRole('button', { name: /next/i }).click();

    // 4. Onboarding - Step 3: Subjects (Select 5)
    await page.getByText('Mathematics', { exact: true }).click();
    await page.getByText('Physics', { exact: true }).click();
    await page.getByText('Chemistry', { exact: true }).click();
    await page.getByText('Biology', { exact: true }).click();
    await page.getByText('History', { exact: true }).click();
    await page.getByRole('button', { name: /next/i }).click();

    // 5. Onboarding - Step 4: Background (Skip)
    await page.getByRole('button', { name: /next/i }).click();

    // 6. Onboarding - Step 5: Marksheet (Skip)
    await page.getByRole('button', { name: /continue/i }).click();

    // 7. Onboarding - Step 6: Orchestration
    const craftButton = page.getByRole('button', { name: /craft my personalized path/i });
    await expect(craftButton).toBeVisible();
    await craftButton.click();

    // Wait for the AI to generate the curriculum and redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 60000 });
    await expect(page.getByText(/Welcome to Your Learning Journey/i)).toBeVisible();

    // 8. Navigation Verification
    // Click 'Path'
    await page.getByRole('button', { name: /path/i }).click();
    await expect(page).toHaveURL(/mode=learn/);
    await expect(page.getByText(/Curriculum Path/i)).toBeVisible();

    // Click 'Session'
    await page.getByRole('button', { name: /session/i }).click();
    await expect(page).toHaveURL(/mode=session/);

    // Click 'Insights'
    await page.getByRole('button', { name: /insights/i }).click();
    await expect(page).toHaveURL(/mode=analytics/);

    // Click 'Library'
    await page.getByRole('button', { name: /library/i }).click();
    await expect(page).toHaveURL(/mode=library/);

    // Click 'Coach'
    await page.getByRole('button', { name: /coach/i }).click();
    await expect(page).toHaveURL(/mode=dashboard|dashboard$/);

    // 9. Back and Forward Navigation
    await page.goBack();
    await expect(page).toHaveURL(/mode=library/);
    await page.goBack();
    await expect(page).toHaveURL(/mode=analytics/);
    await page.goForward();
    await expect(page).toHaveURL(/mode=library/);
    await page.goForward();
    await expect(page).toHaveURL(/mode=dashboard|dashboard$/);

    console.log("✅ E2E Test completed successfully.");
  });
});
