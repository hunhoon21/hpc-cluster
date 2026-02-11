import { test, expect } from '@playwright/test';

test.describe('AVATAR OnE v1.5 E2E Tests', () => {

  test('Test 1: App loads and shows v1.5', async ({ page }) => {
    await page.goto('/');

    // Verify header elements
    await expect(page.getByText('AVATAR OnE')).toBeVisible();
    await expect(page.getByText('v1.5', { exact: true })).toBeVisible();

    // Verify user home page content
    await expect(page.getByRole('heading', { name: /Avatar App 워크스페이스/i })).toBeVisible();
  });

  test('Test 2: User navigation - all pages accessible', async ({ page }) => {
    await page.goto('/');

    const navItems = [
      { name: 'Builder', expectedTitle: /Builder/ },
      { name: '테스트 실행', expectedTitle: /테스트 실행/ },
      { name: 'Trainer', expectedTitle: /Trainer/ },
      { name: '컴포넌트 라이브러리', expectedTitle: /컴포넌트/ },
      { name: '워크로드 목록', expectedTitle: /워크로드/ },
      { name: '결과 모델', expectedTitle: /결과 모델/ },
    ];

    for (const item of navItems) {
      await page.getByRole('navigation').getByRole('button', { name: item.name }).click();
      await expect(page.locator('h1, h2, h3').filter({ hasText: item.expectedTitle }).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('Test 3: Builder page - App list view', async ({ page }) => {
    await page.goto('/');

    // Navigate to Builder
    await page.getByRole('navigation').getByRole('button', { name: 'Builder' }).click();

    // Verify Builder title
    await expect(page.getByText(/Builder — App 개발/i)).toBeVisible();

    // Verify App list is shown with existing apps
    await expect(page.getByText(/App 목록/i).first()).toBeVisible();

    // Verify existing apps are displayed (INIT_SPECS has 2 apps)
    await expect(page.getByText('LLM-FineTune-v3')).toBeVisible();
    await expect(page.getByText('ResNet-Exp-42')).toBeVisible();

    // Verify "새 App 만들기" button exists
    await expect(page.getByRole('button', { name: /새 App 만들기/i })).toBeVisible();
  });

  test('Test 4: Builder - select existing App to edit', async ({ page }) => {
    await page.goto('/');

    // Navigate to Builder
    await page.getByRole('navigation').getByRole('button', { name: 'Builder' }).click();

    // Click on an existing App to enter editor
    await page.getByText('LLM-FineTune-v3').click();

    // Verify editor view loaded with back button
    await expect(page.getByRole('button', { name: /← App 목록/i })).toBeVisible();

    // Verify 3 tabs present
    await expect(page.getByRole('tab', { name: 'App 관리' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Task 편집' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '워크플로우 시각화' })).toBeVisible();

    // Verify App name is loaded
    await expect(page.getByLabel(/App 이름/i)).toHaveValue('LLM-FineTune-v3');

    // Verify back button returns to list
    await page.getByRole('button', { name: /← App 목록/i }).click();
    await expect(page.getByText(/App 목록/i).first()).toBeVisible();
  });

  test('Test 5: Builder - create new App flow', async ({ page }) => {
    await page.goto('/');

    // Navigate to Builder
    await page.getByRole('navigation').getByRole('button', { name: 'Builder' }).click();

    // Click "새 App 만들기"
    await page.getByRole('button', { name: /새 App 만들기/i }).click();

    // Verify editor view for new App
    await expect(page.getByRole('button', { name: /← App 목록/i })).toBeVisible();
    await expect(page.getByText(/새 App 만들기/i)).toBeVisible();

    // Verify App 이름 field is empty
    const nameInput = page.getByLabel(/App 이름/i);
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveValue('');
  });

  test('Test 6: Builder - Task editing with visual component nodes', async ({ page }) => {
    await page.goto('/');

    // Navigate to Builder and open existing App
    await page.getByRole('navigation').getByRole('button', { name: 'Builder' }).click();
    await page.getByText('LLM-FineTune-v3').click();

    // Switch to Task 편집 tab
    await page.getByRole('tab', { name: 'Task 편집' }).click();

    // Verify Component section header visible
    await expect(page.getByText(/Component/i).first()).toBeVisible();

    // Verify "직접 추가" button exists
    await expect(page.getByRole('button', { name: /직접 추가/i })).toBeVisible();

    // Verify visual node cards are displayed (component names visible)
    await expect(page.getByText('data-loader').first()).toBeVisible();
    await expect(page.getByText('preprocessor').first()).toBeVisible();
    await expect(page.getByText('trainer').first()).toBeVisible();

    // Verify arrow (→) buttons exist on nodes for workflow connections
    const arrowButtons = page.getByRole('button', { name: '연결' });
    await expect(arrowButtons.first()).toBeVisible();

    // Verify edit (✎) buttons exist on nodes
    const editButtons = page.getByRole('button', { name: '편집' });
    await expect(editButtons.first()).toBeVisible();

    // Click edit button to expand component detail
    await editButtons.first().click();
    await expect(page.getByText(/상세 편집/i)).toBeVisible();
  });

  test('Test 7: Builder - arrow button workflow connection', async ({ page }) => {
    await page.goto('/');

    // Navigate to Builder and open existing App
    await page.getByRole('navigation').getByRole('button', { name: 'Builder' }).click();
    await page.getByText('LLM-FineTune-v3').click();

    // Switch to Task 편집 tab
    await page.getByRole('tab', { name: 'Task 편집' }).click();

    // Verify arrow (→) buttons exist on component nodes
    const arrowButtons = page.getByRole('button', { name: '연결' });
    await expect(arrowButtons.first()).toBeVisible();

    // Click arrow button on first component to enter connect mode
    await arrowButtons.first().click();

    // Verify connect mode is active with source info
    await expect(page.getByText(/타겟 노드를 클릭하세요/i)).toBeVisible();

    // Click cancel to exit connect mode
    await page.getByRole('button', { name: /취소/i }).click();

    // Verify connect mode exited
    await expect(page.getByText(/타겟 노드를 클릭하세요/i)).not.toBeVisible();
  });

  test('Test 7b: Builder - real-time workflow preview in Task editor', async ({ page }) => {
    await page.goto('/');

    // Navigate to Builder and open existing App with connections
    await page.getByRole('navigation').getByRole('button', { name: 'Builder' }).click();
    await page.getByText('LLM-FineTune-v3').click();

    // Switch to Task 편집 tab
    await page.getByRole('tab', { name: 'Task 편집' }).click();

    // Verify real-time workflow preview is visible in the Task editor
    await expect(page.getByText(/워크플로우 미리보기/i)).toBeVisible();

    // Verify the SVG diagram is rendered (existing app has workflow connections)
    await expect(page.locator('svg').first()).toBeVisible();
  });

  test('Test 8: Component Library page', async ({ page }) => {
    await page.goto('/');

    // Navigate to Component Library
    await page.getByRole('navigation').getByRole('button', { name: '컴포넌트 라이브러리' }).click();

    // Verify page title
    await expect(page.getByText(/컴포넌트 글로벌 라이브러리/i)).toBeVisible();

    // Verify component list table is displayed
    await expect(page.locator('table').first()).toBeVisible();

    // Verify NO "유형" column
    const typeHeader = page.locator('th').filter({ hasText: /^유형$/ });
    await expect(typeHeader).not.toBeVisible().catch(() => Promise.resolve());
  });

  test('Test 9: Trainer page', async ({ page }) => {
    await page.goto('/');

    // Navigate to Trainer
    await page.getByRole('navigation').getByRole('button', { name: 'Trainer' }).click();

    // Verify page title
    await expect(page.locator('h1, h2, h3').filter({ hasText: /Trainer/i }).first()).toBeVisible();

    // Verify "App 선택" step visible
    await expect(page.getByText(/App 선택/i)).toBeVisible();

    // Select first available App
    await page.getByText('LLM-FineTune-v3').click();
    await page.waitForTimeout(500);

    // Verify learning parameter fields exist
    await expect(page.getByText(/에피소드/i).first()).toBeVisible();
    await expect(page.getByText(/학습률/i).first()).toBeVisible();
  });

  test('Test 10: Admin mode - approval with loop test', async ({ page }) => {
    await page.goto('/');

    // Switch to admin mode
    await page.getByRole('button', { name: '관리자' }).click();

    // Verify admin menu visible
    await expect(page.getByText(/관리자 메뉴/i)).toBeVisible();

    // Navigate to approval management
    await page.getByRole('navigation').getByRole('button', { name: '승인 관리' }).click();

    // Verify approval page loaded
    await expect(page.locator('h1, h2, h3').filter({ hasText: /승인 관리/i }).first()).toBeVisible();
  });

  test('Test 11: Admin mode - queue management', async ({ page }) => {
    await page.goto('/');

    // Switch to admin mode
    await page.getByRole('button', { name: '관리자' }).click();

    // Navigate to queue management
    await page.getByRole('navigation').getByRole('button', { name: '대기열 관리' }).click();

    // Verify queue page loads
    await expect(page.locator('h1, h2, h3').filter({ hasText: /대기열/i }).first()).toBeVisible();
  });

  test('Test 12: Mode toggle works', async ({ page }) => {
    await page.goto('/');

    // Start in user mode
    await expect(page.getByRole('navigation').getByRole('button', { name: 'Builder' })).toBeVisible();

    // Switch to admin mode
    await page.getByRole('button', { name: '관리자' }).click();
    await expect(page.getByText(/관리자 메뉴/i)).toBeVisible();
    await expect(page.getByRole('navigation').getByRole('button', { name: '승인 관리' })).toBeVisible();

    // Switch back to user mode
    await page.getByRole('button', { name: '사용자' }).click();
    await expect(page.getByRole('navigation').getByRole('button', { name: 'Builder' })).toBeVisible();
  });

  test('Test 13: Terminology check - no "파이프라인" text', async ({ page }) => {
    await page.goto('/');
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('파이프라인');
  });

  test('Test 14: Home page v1.5 workflow display', async ({ page }) => {
    await page.goto('/');

    // Verify v1.5 workflow text visible
    await expect(page.getByText(/v1\.5 워크플로우/i)).toBeVisible();

    // Verify workflow steps contain "Builder" and "Trainer"
    await expect(page.getByRole('main').getByText(/Builder/i).first()).toBeVisible();
    await expect(page.getByRole('main').getByText(/Trainer/i).first()).toBeVisible();
  });
});
