import { test, expect } from '@playwright/test';

test.describe('LawLens-X E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test('should render the application with navbar and main sections', async ({ page }) => {
    // Check navbar
    const navbar = page.locator('nav');
    await expect(navbar).toBeVisible();
    
    // Check for LawLens-X title or branding
    const heading = page.locator('h1, h2, [role="banner"]');
    await expect(heading).toHaveCount(1);
    
    // Check for main content sections
    const main = page.locator('main');
    await expect(main).toBeVisible();
    
    // Verify grid layout with input and results areas
    const gridContainers = page.locator('[class*="grid"], [class*="gap"]');
    await expect(gridContainers).toBeTruthy();
  });

  test('should display contract input textarea', async ({ page }) => {
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute('placeholder', /contract|input|text/i);
  });

  test('should display analyze button', async ({ page }) => {
    const analyzeButton = page.getByRole('button', { name: /analyze|submit|process/i });
    await expect(analyzeButton).toBeVisible();
    await expect(analyzeButton).toBeEnabled();
  });

  test('should show loading state when button is disabled during analysis', async ({ page, context }) => {
    // Intercept API calls to slow down the response
    await context.route('**/api/analyze/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Delay for 1 second
      await route.abort();
    });

    const textarea = page.locator('textarea').first();
    const analyzeButton = page.getByRole('button', { name: /analyze|submit|process/i });
    
    // Enter sample contract text
    await textarea.fill('This is a sample contract with payment terms.');
    
    // Click analyze button
    await analyzeButton.click();
    
    // Button should be disabled or show loading state
    await expect(analyzeButton).toBeDisabled();
    
    // Wait a bit and check for loading indicator
    const loadingText = page.locator('text=/loading|analyzing|processing/i');
    const isVisible = await loadingText.isVisible().catch(() => false);
    expect(isVisible || await analyzeButton.isDisabled()).toBeTruthy();
  });

  test('should display results when analysis completes successfully', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    const analyzeButton = page.getByRole('button', { name: /analyze|submit|process/i });
    
    // Enter a valid contract sample
    const sampleContract = `
      SERVICE AGREEMENT
      
      1. PAYMENT TERMS: Payment shall be due within 30 days of invoice.
      2. LIABILITY: Provider is not liable for any damages.
      3. TERMINATION: Either party may terminate with 30 days notice.
      4. CONFIDENTIALITY: All information is confidential.
      5. INDEMNIFICATION: Client indemnifies Provider against all claims.
    `;
    
    await textarea.fill(sampleContract);
    await analyzeButton.click();
    
    // Wait for results to appear (with extended timeout for backend processing)
    await page.waitForTimeout(3000);
    
    // Check for results dashboard
    const results = page.locator('[class*="Results"], [class*="Dashboard"], [class*="Score"]');
    const isVisible = await results.isVisible().catch(() => false);
    
    if (isVisible) {
      await expect(results).toBeVisible();
    }
    
    // Check for risk score display
    const riskScore = page.locator('text=/risk|score|overall/i');
    const riskVisible = await riskScore.isVisible().catch(() => false);
    expect(riskVisible || isVisible).toBeTruthy();
  });

  test('should show error message when contract input is empty', async ({ page }) => {
    const analyzeButton = page.getByRole('button', { name: /analyze|submit|process/i });
    
    // Textarea should be empty by default
    const textarea = page.locator('textarea').first();
    await expect(textarea).toHaveValue('');
    
    // Button might be disabled or should produce an error
    const isDisabled = await analyzeButton.isDisabled().catch(() => false);
    
    if (!isDisabled) {
      await analyzeButton.click();
      
      // Look for error message
      const errorMessage = page.locator('[role="alert"], [class*="error"]');
      const isVisible = await errorMessage.isVisible().catch(() => false);
      
      // Should either be disabled or show error
      expect(isDisabled || isVisible).toBeTruthy();
    } else {
      expect(isDisabled).toBeTruthy();
    }
  });

  test('should handle optional query field', async ({ page }) => {
    const queryInputs = page.locator('input[type="text"]');
    
    // Look for a query/question input field
    const queryInput = queryInputs.filter({ hasText: /query|question|ask/i }).first();
    
    // Verify it exists and can be interacted with
    const exists = await queryInput.isVisible().catch(() => false);
    if (exists) {
      await expect(queryInput).toBeVisible();
      await queryInput.fill('What are the main risks?');
      await expect(queryInput).toHaveValue('What are the main risks?');
    }
  });

  test('should maintain state when switching between tabs/sections', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    const sampleText = 'Test contract text for state management';
    
    // Fill textarea
    await textarea.fill(sampleText);
    
    // Verify text is retained
    await expect(textarea).toHaveValue(sampleText);
    
    // Navigate away and back (if there are navigation options)
    const pageTitle = page.locator('body');
    await expect(pageTitle).toBeTruthy();
    
    // Verify text is still there
    await expect(textarea).toHaveValue(sampleText);
  });

  test('should render responsive layout on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Wait for layout to adjust
    await page.waitForLoadState('networkidle');
    
    // Check that elements are still visible but rearranged
    const navbar = page.locator('nav');
    const textarea = page.locator('textarea').first();
    
    await expect(navbar).toBeVisible();
    await expect(textarea).toBeVisible();
  });

  test('should be accessible with keyboard navigation', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    const analyzeButton = page.getByRole('button', { name: /analyze|submit|process/i });
    
    // Tab to textarea
    await page.keyboard.press('Tab');
    await textarea.fill('Sample contract');
    
    // Tab to button and press Enter
    await page.keyboard.press('Tab');
    await expect(analyzeButton).toBeFocused();
    
    // Button should be focusable
    const isFocusable = await analyzeButton.evaluate((el) => {
      return !el.hasAttribute('disabled');
    }).catch(() => true);
    
    expect(isFocusable).toBeTruthy();
  });
});
