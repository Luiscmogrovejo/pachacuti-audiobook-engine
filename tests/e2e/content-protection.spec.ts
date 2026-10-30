// tests/e2e/content-protection.spec.ts -- Phase 7.10 Content Protection E2E Tests
// Verifies CopyProtection.tsx blocks: context menu, keyboard shortcuts, copy/cut,
// selectstart, dragstart, print blanking, and visibility blur.

import { test, expect } from '@playwright/test'

test.describe('Content Protection -- CopyProtection.tsx', () => {
  // Use prologue listen page where CopyProtection is mounted
  const LISTEN_URL = '/listen/prologue'

  test('right-click (contextmenu) is prevented', async ({ page }) => {
    await page.goto(LISTEN_URL)
    await page.waitForTimeout(3000) // Wait for CopyProtection mount

    const prevented = await page.evaluate(() => {
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
      return !document.dispatchEvent(event) // returns false if preventDefault was called
    })
    expect(prevented).toBe(true)
  })

  test('Ctrl+C (copy shortcut) is prevented', async ({ page }) => {
    await page.goto(LISTEN_URL)
    await page.waitForTimeout(3000)

    const prevented = await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'c', ctrlKey: true, bubbles: true, cancelable: true,
      })
      return !document.dispatchEvent(event)
    })
    expect(prevented).toBe(true)
  })

  test('Ctrl+A (select all shortcut) is prevented', async ({ page }) => {
    await page.goto(LISTEN_URL)
    await page.waitForTimeout(3000)

    const prevented = await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'a', ctrlKey: true, bubbles: true, cancelable: true,
      })
      return !document.dispatchEvent(event)
    })
    expect(prevented).toBe(true)
  })

  test('Ctrl+S (save shortcut) is prevented', async ({ page }) => {
    await page.goto(LISTEN_URL)
    await page.waitForTimeout(3000)

    const prevented = await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', {
        key: 's', ctrlKey: true, bubbles: true, cancelable: true,
      })
      return !document.dispatchEvent(event)
    })
    expect(prevented).toBe(true)
  })

  test('Ctrl+P (print shortcut) is prevented', async ({ page }) => {
    await page.goto(LISTEN_URL)
    await page.waitForTimeout(3000)

    const prevented = await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'p', ctrlKey: true, bubbles: true, cancelable: true,
      })
      return !document.dispatchEvent(event)
    })
    expect(prevented).toBe(true)
  })

  test('Ctrl+U (view source shortcut) is prevented', async ({ page }) => {
    await page.goto(LISTEN_URL)
    await page.waitForTimeout(3000)

    const prevented = await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'u', ctrlKey: true, bubbles: true, cancelable: true,
      })
      return !document.dispatchEvent(event)
    })
    expect(prevented).toBe(true)
  })

  test('F12 (dev tools) is prevented', async ({ page }) => {
    await page.goto(LISTEN_URL)
    await page.waitForTimeout(3000)

    const prevented = await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'F12', bubbles: true, cancelable: true,
      })
      return !document.dispatchEvent(event)
    })
    expect(prevented).toBe(true)
  })

  test('Ctrl+Shift+I (dev tools) is prevented', async ({ page }) => {
    await page.goto(LISTEN_URL)
    await page.waitForTimeout(3000)

    const prevented = await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'I', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true,
      })
      return !document.dispatchEvent(event)
    })
    expect(prevented).toBe(true)
  })

  test('copy event is prevented', async ({ page }) => {
    await page.goto(LISTEN_URL)
    await page.waitForTimeout(3000)

    const prevented = await page.evaluate(() => {
      const event = new ClipboardEvent('copy', { bubbles: true, cancelable: true })
      return !document.dispatchEvent(event)
    })
    expect(prevented).toBe(true)
  })

  test('cut event is prevented', async ({ page }) => {
    await page.goto(LISTEN_URL)
    await page.waitForTimeout(3000)

    const prevented = await page.evaluate(() => {
      const event = new ClipboardEvent('cut', { bubbles: true, cancelable: true })
      return !document.dispatchEvent(event)
    })
    expect(prevented).toBe(true)
  })

  test('selectstart event is prevented', async ({ page }) => {
    await page.goto(LISTEN_URL)
    await page.waitForTimeout(3000)

    const prevented = await page.evaluate(() => {
      const event = new Event('selectstart', { bubbles: true, cancelable: true })
      return !document.dispatchEvent(event)
    })
    expect(prevented).toBe(true)
  })

  test('dragstart event is prevented', async ({ page }) => {
    await page.goto(LISTEN_URL)
    await page.waitForTimeout(3000)

    const prevented = await page.evaluate(() => {
      const event = new DragEvent('dragstart', { bubbles: true, cancelable: true })
      return !document.dispatchEvent(event)
    })
    expect(prevented).toBe(true)
  })

  test('beforeprint sets body visibility to hidden', async ({ page }) => {
    await page.goto(LISTEN_URL)
    await page.waitForTimeout(3000)

    const visibilityAfterPrint = await page.evaluate(() => {
      window.dispatchEvent(new Event('beforeprint'))
      const visibility = document.body.style.visibility
      // Restore
      window.dispatchEvent(new Event('afterprint'))
      return visibility
    })
    expect(visibilityAfterPrint).toBe('hidden')
  })

  test('afterprint restores body visibility', async ({ page }) => {
    await page.goto(LISTEN_URL)
    await page.waitForTimeout(3000)

    const visibilityAfterRestore = await page.evaluate(() => {
      window.dispatchEvent(new Event('beforeprint'))
      window.dispatchEvent(new Event('afterprint'))
      return document.body.style.visibility
    })
    expect(visibilityAfterRestore).toBe('visible')
  })

  test('visibilitychange applies blur filter when hidden', async ({ page }) => {
    await page.goto(LISTEN_URL)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(5000)

    const blurFilter = await page.evaluate(() => {
      // Mock document.hidden
      Object.defineProperty(document, 'hidden', { value: true, writable: true })
      document.dispatchEvent(new Event('visibilitychange'))
      const filter = document.body.style.filter
      // Restore
      Object.defineProperty(document, 'hidden', { value: false, writable: true })
      document.dispatchEvent(new Event('visibilitychange'))
      return filter
    })
    expect(blurFilter).toContain('blur')
  })

  test('visibilitychange removes blur filter when visible', async ({ page }) => {
    await page.goto(LISTEN_URL)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(5000)

    const filter = await page.evaluate(() => {
      // First hide
      Object.defineProperty(document, 'hidden', { value: true, writable: true })
      document.dispatchEvent(new Event('visibilitychange'))
      // Then show
      Object.defineProperty(document, 'hidden', { value: false, writable: true })
      document.dispatchEvent(new Event('visibilitychange'))
      return document.body.style.filter
    })
    // After restoring visibility, filter is either 'none' or '' (empty when inline style is removed)
    expect(filter === 'none' || filter === '').toBe(true)
  })
})
