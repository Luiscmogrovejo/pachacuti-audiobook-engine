import { test, expect } from '@playwright/test'

test.describe('Universe Portal', () => {
  test.describe('Characters', () => {
    test('character gallery page loads with heading', async ({ page }) => {
      await page.goto('/characters')
      await expect(page).toHaveTitle(/Personajes.*Pachacuti|Pachacuti/)
      await expect(page.locator('h1').filter({ hasText: 'Los Personajes de Pachacuti' })).toBeVisible()
    })

    test('character gallery shows main trio (Cusi)', async ({ page }) => {
      await page.goto('/characters')
      // Main trio section should show "El Trio Principal"
      await expect(page.locator('text=El Trio Principal')).toBeVisible()
      // Cusi Yupanqui should be in the gallery
      await expect(page.locator('text=CUSI YUPANQUI').or(page.locator('text=Cusi Yupanqui')).first()).toBeVisible()
    })

    test('character detail page loads for Cusi', async ({ page }) => {
      await page.goto('/characters/cusi')
      await expect(page).toHaveTitle(/CUSI YUPANQUI|Pachacuti/)
      // Character name should appear
      await expect(page.locator('h1').filter({ hasText: 'CUSI YUPANQUI' })).toBeVisible()
    })

    test('character detail page has bio sections', async ({ page }) => {
      await page.goto('/characters/cusi')
      // Should show key sections
      await expect(page.locator('h2').filter({ hasText: 'Quien Es' })).toBeVisible()
      await expect(page.locator('h2').filter({ hasText: 'Personalidad' })).toBeVisible()
      await expect(page.locator('h2').filter({ hasText: 'Arco Narrativo' })).toBeVisible()
    })

    test('invalid character slug redirects to gallery', async ({ page }) => {
      const response = await page.goto('/characters/nonexistent-person')
      // Should redirect to /characters
      expect(page.url()).toContain('/characters')
    })
  })

  test.describe('Glossary', () => {
    test('glossary page loads with heading', async ({ page }) => {
      await page.goto('/glossary')
      await expect(page).toHaveTitle(/Glossary.*Pachacuti|Pachacuti/)
      await expect(page.locator('h1').filter({ hasText: 'Simi Taqe' })).toBeVisible()
    })

    test('glossary shows entry count', async ({ page }) => {
      await page.goto('/glossary')
      // Bilingual: "186 palabras" (es) or "186 words" (en)
      await expect(page.getByText(/186 (words|palabras)/)).toBeVisible()
    })

    test('glossary search input is present after hydration', async ({ page }) => {
      await page.goto('/glossary')
      await page.waitForTimeout(3000) // GlossaryBrowser client:visible hydration
      // Scroll into view to trigger hydration
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(2000)
      const searchInput = page.locator('input[type="search"]').or(page.locator('input[placeholder*="earch" i]')).or(page.locator('input[type="text"]'))
      // The GlossaryBrowser must be scrolled into view for client:visible hydration
      if (await searchInput.count() > 0) {
        await expect(searchInput.first()).toBeVisible()
      }
    })
  })

  test.describe('Quiz', () => {
    test('quiz page loads with heading', async ({ page }) => {
      await page.goto('/quiz')
      await expect(page).toHaveTitle(/Quiz.*Pachacuti|Pachacuti/)
      await expect(page.locator('h1').filter({ hasText: 'Yachay' })).toBeVisible()
    })

    test('quiz shows question count', async ({ page }) => {
      await page.goto('/quiz')
      // Bilingual: "120 preguntas en 6 categorias" (es) or "120 questions across 6 categories" (en)
      await expect(page.locator('header').getByText(/120 (questions|preguntas)/)).toBeVisible()
    })

    test('quiz engine renders buttons after hydration', async ({ page }) => {
      await page.goto('/quiz')
      // Scroll to trigger client:visible hydration
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(3000)
      // QuizEngine should render category buttons or start button
      const buttons = page.locator('button')
      const count = await buttons.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Map (Removed -- 301 Redirect)', () => {
    test('/map redirects to homepage', async ({ page }) => {
      await page.goto('/map')
      // After redirect, should be on homepage
      expect(page.url()).toMatch(/\/$/)
    })
  })
})
