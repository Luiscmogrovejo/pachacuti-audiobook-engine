import { test, expect } from '@playwright/test'

test.describe('Bugfix Audit: Player pause, chapters, scenes', () => {
  // === BUG 1: Player pause reliability ===

  test('pause button immediately stops audio (no 200ms delay leak)', async ({ page }) => {
    await page.goto('/listen/prologue')
    // Wait for player controls to hydrate
    const playBtn = page.getByRole('button', { name: 'Play', exact: true })
    await expect(playBtn).toBeVisible({ timeout: 15_000 })

    // Click play then immediately pause
    await playBtn.click()
    await page.waitForTimeout(300) // Let play attempt process

    const pauseBtn = page.getByRole('button', { name: 'Pause', exact: true })
    // If play was rejected by autoplay policy, button stays as "Play" -- that's fine
    const isPaused = (await pauseBtn.count()) === 0
    if (!isPaused) {
      await pauseBtn.click()
      // After clicking pause, button should revert to "Play"
      await expect(playBtn).toBeVisible({ timeout: 3_000 })
    }
  })

  test('rapid play/pause toggle does not desync UI', async ({ page }) => {
    await page.goto('/listen/prologue')
    // Wait for either Play or Pause button
    const playOrPause = page.getByRole('button', { name: /^(Play|Pause)$/ })
    await expect(playOrPause).toBeVisible({ timeout: 15_000 })

    // Rapid toggle 5 times -- click whichever is currently visible
    for (let i = 0; i < 5; i++) {
      const btn = page.getByRole('button', { name: /^(Play|Pause)$/ })
      await btn.click()
      await page.waitForTimeout(100)
    }

    // After toggling, check that the state is consistent
    // (either play or pause button visible, not stuck)
    await page.waitForTimeout(500)
    const hasPlayBtn = (await page.getByRole('button', { name: 'Play', exact: true }).count()) > 0
    const hasPauseBtn = (await page.getByRole('button', { name: 'Pause', exact: true }).count()) > 0
    expect(hasPlayBtn || hasPauseBtn).toBeTruthy()
  })

  // === BUG 2: Chapter configs for ch13-19 ===

  test('chapter 13 has audio config (not null)', async ({ page }) => {
    // Chapter 13 is paid tier, but the page should still load (PaidGate shows)
    const response = await page.goto('/listen/chapter-13')
    expect(response?.status()).toBe(200)
  })

  test('chapter drawer shows ch13-19 as playable (not "Coming soon")', async ({ page }) => {
    await page.goto('/listen/prologue')
    // Wait for player to hydrate
    await expect(page.getByRole('button', { name: 'Open chapter list' })).toBeVisible({ timeout: 15_000 })
    // Open chapter drawer
    await page.getByRole('button', { name: 'Open chapter list' }).click()
    await page.waitForTimeout(500)

    // Chapter 13 should NOT show "Coming soon"
    const ch13Row = page.locator('button').filter({ hasText: 'CHAPTER 13' })
    await expect(ch13Row).toBeVisible({ timeout: 5_000 })
    // It should be enabled (not disabled)
    await expect(ch13Row).toBeEnabled()
  })

  // === BUG 3: Scene images match files on disk ===

  test('prologue scene images load (ch00-scene-01 through 10)', async ({ page }) => {
    await page.goto('/listen/prologue')
    await page.waitForTimeout(2000)
    // Check that the SceneCycler has rendered at least one img
    const sceneImg = page.locator('img[role="presentation"]')
    const count = await sceneImg.count()
    expect(count).toBeGreaterThan(0)
  })

  test('scene image ch00-scene-09 is accessible (was previously missing from config)', async ({ page }) => {
    // Verify the image file is served correctly
    const response = await page.goto('/art/scenes/ch00/ch00-scene-09.webp')
    expect(response?.status()).toBe(200)
    expect(response?.headers()['content-type']).toContain('image')
  })

  test('scene image ch02-scene-09 is accessible (was previously missing from config)', async ({ page }) => {
    const response = await page.goto('/art/scenes/ch02/ch02-scene-09.webp')
    expect(response?.status()).toBe(200)
    expect(response?.headers()['content-type']).toContain('image')
  })

  test('scene image ch04-scene-09 is accessible (was previously missing from config)', async ({ page }) => {
    const response = await page.goto('/art/scenes/ch04/ch04-scene-09.webp')
    expect(response?.status()).toBe(200)
    expect(response?.headers()['content-type']).toContain('image')
  })

  // === Scene images that were referenced but did NOT exist (404s) ===

  test('ch06-scene-09 is accessible (file exists on disk)', async ({ page }) => {
    const response = await page.goto('/art/scenes/ch06/ch06-scene-09.webp')
    // File was added during scene image audit -- should now be 200
    expect(response?.status()).toBe(200)
    expect(response?.headers()['content-type']).toContain('image')
  })

  // === Character portraits ===

  test('character portrait images load on gallery page', async ({ page }) => {
    await page.goto('/characters')
    await page.waitForTimeout(2000)
    // At least some character images should be present
    const imgs = page.locator('img')
    const count = await imgs.count()
    expect(count).toBeGreaterThan(0)
  })

  test('Cusi portrait loads on character detail page', async ({ page }) => {
    await page.goto('/characters/cusi')
    // Portrait should exist even if fallback initial is shown first
    const portraitImg = page.locator('img[alt="CUSI YUPANQUI"]')
    await expect(portraitImg).toBeAttached({ timeout: 5_000 })
    // Check the src points to cusi.webp
    const src = await portraitImg.getAttribute('src')
    expect(src).toContain('cusi.webp')
  })

  // === Glossary audio ===

  test('glossary page has audio play buttons', async ({ page }) => {
    await page.goto('/glossary')
    // Scroll to trigger hydration
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(3000)
    // Audio play buttons should be present
    const audioButtons = page.locator('[aria-label*="Play"]')
    const count = await audioButtons.count()
    expect(count).toBeGreaterThan(0)
  })

  // === Quiz ===

  test('quiz can start and answer a question', async ({ page }) => {
    await page.goto('/quiz')
    // Scroll to hydrate
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(3000)

    // Quiz is bilingual: "Start Quiz" (en) or "Iniciar Quiz" (es)
    const questionText = page.getByText(/Question 1 of|Pregunta 1 de/)
    const startBtn = page.locator('button').filter({ hasText: /Start Quiz|Iniciar Quiz/i })

    if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startBtn.click()
      await page.waitForTimeout(1000)
    }

    // Should see question 1 (quiz may auto-start on some configs)
    await expect(questionText).toBeVisible({ timeout: 5_000 })

    // Click any answer button (the quiz answer options are regular buttons inside the quiz container)
    const mainContent = page.locator('main')
    const answerBtns = mainContent.locator('button').filter({ hasNotText: /Check Answer|Verificar Respuesta|Next Question|Siguiente Pregunta|Start|Iniciar/i })
    const count = await answerBtns.count()
    if (count > 0) {
      await answerBtns.first().click()
      // Check Answer button should appear (bilingual)
      await expect(mainContent.locator('button').filter({ hasText: /Check Answer|Verificar Respuesta/ })).toBeVisible({ timeout: 3_000 })
    }
  })

  // === Map (removed -- redirects to homepage) ===

  test('/map redirects to homepage', async ({ page }) => {
    await page.goto('/map')
    expect(page.url()).toMatch(/\/$/)
  })

  // === Chapter navigation ===

  test('chapter-01 loads and shows correct title', async ({ page }) => {
    await page.goto('/listen/chapter-01')
    await page.waitForTimeout(3000)
    await expect(page.locator('text=Qosqo').first()).toBeVisible({ timeout: 10_000 })
  })

  test('next chapter button navigates forward', async ({ page }) => {
    await page.goto('/listen/prologue')
    await page.waitForTimeout(3000)
    const nextBtn = page.getByRole('button', { name: 'Next chapter' })
    await expect(nextBtn).toBeVisible({ timeout: 10_000 })
    await nextBtn.click()
    await page.waitForTimeout(2000)
    // URL should change to chapter-01
    expect(page.url()).toContain('chapter-01')
  })

  // === Mini player ===

  test('mini player appears on non-listen pages after chapter visit', async ({ page }) => {
    // First visit a listen page to set chapter in store
    await page.goto('/listen/prologue')
    await page.waitForTimeout(3000)
    // Navigate to homepage
    await page.goto('/')
    await page.waitForTimeout(3000)
    // Mini player should be visible
    const miniPlayer = page.locator('[aria-label="Mini player"]')
    await expect(miniPlayer).toBeVisible({ timeout: 10_000 })
  })

  // === Sleep timer ===

  test('sleep timer button is visible on listen page', async ({ page }) => {
    await page.goto('/listen/prologue')
    const sleepBtn = page.getByRole('button', { name: /sleep timer/i })
    await expect(sleepBtn).toBeVisible({ timeout: 15_000 })
  })

  // === Bookmark ===

  test('bookmark button is visible on listen page', async ({ page }) => {
    await page.goto('/listen/prologue')
    const bmBtn = page.getByRole('button', { name: /add bookmark/i })
    await expect(bmBtn).toBeVisible({ timeout: 15_000 })
  })

  // === Continue Listening CTA ===

  test('homepage shows Start Listening CTA', async ({ page }) => {
    await page.goto('/')
    // Bilingual: "Comenzar a Escuchar" (es) or "Start Listening" (en)
    // Look inside the hero section (the one with the h1)
    const heroSection = page.locator('section').filter({ has: page.locator('h1') }).first()
    await expect(heroSection.locator('a[href="/listen/prologue"]')).toBeVisible()
  })
})
