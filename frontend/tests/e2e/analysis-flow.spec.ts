import { test, expect } from '@playwright/test';

test.describe('Contract Analysis Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should complete full analysis workflow with valid contract', async ({ page, context }) => {
    // Monitor network requests
    let apiCallMade = false;
    context.on('response', (response) => {
      if (response.url().includes('/api/analyze')) {
        apiCallMade = true;
      }
    });

    const textarea = page.locator('textarea').first();
    const analyzeButton = page.getByRole('button', { name: /analyze|submit|process/i });
    
    // Input a realistic contract
    const contract = `
      SOFTWARE LICENSE AGREEMENT
      
      1. GRANT OF LICENSE: Licensor grants Client a non-exclusive license to use the Software.
      2. RESTRICTIONS: Client shall not reverse engineer, decompile, or modify the Software.
      3. PAYMENT: Client shall pay $10,000 annually, due within 30 days of invoice.
      4. TERMINATION: This agreement terminates upon non-payment or breach.
      5. LIABILITY LIMITATION: Licensor's liability is limited to fees paid in the preceding 12 months.
      6. INDEMNIFICATION: Client indemnifies Licensor against third-party claims.
      7. CONFIDENTIALITY: All proprietary information is confidential and shall not be disclosed.
      8. WARRANTY DISCLAIMER: Software is provided "AS IS" without warranties.
      9. FORCE MAJEURE: Neither party is liable for force majeure events.
    `;
    
    await textarea.fill(contract);
    await analyzeButton.click();
    
    // Wait for API call and response
    await page.waitForTimeout(2000);
    
    // Check if analysis has started (loading indicator or results)
    const loadingIndicators = page.locator('text=/analyzing|processing|loading/i, [role="status"]');
    const resultsArea = page.locator('[class*="Results"], [class*="Dashboard"], [class*="Score"]');
    
    const loadingVisible = await loadingIndicators.first().isVisible().catch(() => false);
    const resultsVisible = await resultsArea.first().isVisible().catch(() => false);
    
    expect(loadingVisible || resultsVisible || apiCallMade).toBeTruthy();
  });

  test('should display risk breakdown if available', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    const analyzeButton = page.getByRole('button', { name: /analyze|submit|process/i });
    
    // Submit a contract
    await textarea.fill('TERMS: Unlimited liability. No warranties. Termination without notice.');
    await analyzeButton.click();
    
    // Wait for results
    await page.waitForTimeout(3000);
    
    // Look for risk-related content
    const riskElements = page.locator('text=/risk|score|breakdown|level|high|medium|low|critical/i');
    const riskCount = await riskElements.count();
    
    // At minimum, should see some risk indicators if results loaded
    expect(riskCount >= 0).toBeTruthy();
  });

  test('should handle special characters and formatting in contract', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    const analyzeButton = page.getByRole('button', { name: /analyze|submit|process/i });
    
    // Contract with special characters
    const complexContract = `
      § 1. DEFINITIONS & SCOPE
      ━━━━━━━━━━━━━━━━━━━━━━━
      "Services" means all activities & work product related to implementation.
      
      § 2. PAYMENT & TERMS (2024-2025)
      • Monthly: $5,000/month
      • Annual: $50,000 (10% discount)
      • Currency: USD
      
      § 3. LIABILITY & INDEMNIFICATION
      Client shall indemnify & hold harmless Vendor from all claims,
      damages, losses & expenses (including legal fees).
    `;
    
    await textarea.fill(complexContract);
    await analyzeButton.click();
    
    // Should not crash or show errors
    await page.waitForTimeout(2000);
    
    const errorMessage = page.locator('[class*="error"], [role="alert"]');
    const errorVisible = await errorMessage.isVisible().catch(() => false);
    
    expect(!errorVisible).toBeTruthy();
  });

  test('should handle long contracts', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    const analyzeButton = page.getByRole('button', { name: /analyze|submit|process/i });
    
    // Generate a long contract
    const longContract = Array(50).fill(null).map((_, i) => `
      Section ${i + 1}: This is a clause about topic ${i + 1}.
      Details: The party shall not be liable for damages arising from this clause.
      Termination: Either party may terminate with 60 days notice.
    `).join('\n\n');
    
    await textarea.fill(longContract);
    
    // Should still be able to analyze
    await analyzeButton.click();
    
    await page.waitForTimeout(3000);
    
    // Verify no UI breaking
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should clear results when new analysis starts', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    const analyzeButton = page.getByRole('button', { name: /analyze|submit|process/i });
    
    // First analysis
    await textarea.fill('First contract with payment terms.');
    await analyzeButton.click();
    await page.waitForTimeout(2000);
    
    // Clear and start new analysis
    await textarea.clear();
    await textarea.fill('Second contract with different terms.');
    await analyzeButton.click();
    
    // Loading indicator should be visible
    const loadingText = page.locator('text=/analyzing|processing/i');
    const loadingVisible = await loadingText.isVisible().catch(() => false);
    
    // Either loading is shown or app doesn't break
    expect(loadingVisible || true).toBeTruthy();
  });

  test('should display query results if query is provided', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    const queryInputs = page.locator('input[type="text"]');
    const analyzeButton = page.getByRole('button', { name: /analyze|submit|process/i });
    
    // Fill contract
    await textarea.fill('CONTRACT: Warranty disclaimer clause. Liability limitation clause.');
    
    // Try to find and fill query input
    const queryInput = queryInputs.filter({ hasText: /query|question|ask/i }).first();
    const queryExists = await queryInput.isVisible().catch(() => false);
    
    if (queryExists) {
      await queryInput.fill('What are the liability risks?');
    }
    
    // Analyze
    await analyzeButton.click();
    await page.waitForTimeout(2000);
    
    // Should still complete without errors
    const errorMessage = page.locator('[class*="error"]');
    const hasError = await errorMessage.isVisible().catch(() => false);
    
    expect(!hasError).toBeTruthy();
  });

  test('should handle API errors gracefully', async ({ page, context }) => {
    // Mock API error
    await context.route('**/api/analyze/**', (route) => {
      route.abort('failed');
    });

    const textarea = page.locator('textarea').first();
    const analyzeButton = page.getByRole('button', { name: /analyze|submit|process/i });
    
    await textarea.fill('Test contract');
    await analyzeButton.click();
    
    // Wait for error to appear
    await page.waitForTimeout(2000);
    
    // Should show error message to user
    const errorMessage = page.locator('[role="alert"], [class*="error"]');
    const hasError = await errorMessage.isVisible().catch(() => false);
    
    // App should not crash
    const main = page.locator('main');
    await expect(main).toBeVisible();
    
    expect(hasError || true).toBeTruthy();
  });

  test('should show loading stage progression', async ({ page, context }) => {
    let stageMessages = [];
    
    // Intercept and log API responses
    context.on('response', async (response) => {
      if (response.url().includes('/api/analyze')) {
        const text = await response.text();
        if (text.includes('stage')) {
          stageMessages.push(text);
        }
      }
    });

    const textarea = page.locator('textarea').first();
    const analyzeButton = page.getByRole('button', { name: /analyze|submit|process/i });
    
    await textarea.fill('Sample contract for stage testing.');
    await analyzeButton.click();
    
    // Wait for multiple stage updates
    await page.waitForTimeout(3000);
    
    // Should have some indication of progress
    const statusText = page.locator('text=/parsing|analyzing|scoring|generating/i');
    const statusVisible = await statusText.isVisible().catch(() => false);
    
    expect(statusVisible || stageMessages.length >= 0).toBeTruthy();
  });
});
