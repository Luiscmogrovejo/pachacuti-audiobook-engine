import type { Page } from '@playwright/test'
import path from 'node:path'

const SCREENSHOT_DIR = path.resolve('test-results/screenshots')

/**
 * Take a named screenshot and save to the shared screenshot output directory.
 * Returns the full path to the saved PNG.
 */
export async function takeNamedScreenshot(
  page: Page,
  name: string,
): Promise<string> {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`)
  await page.screenshot({ path: filePath, fullPage: true })
  return filePath
}
