import { expect, test } from '@playwright/test'

const routes = ['/', '/login', '/register', '/reset-password/request', '/route-that-does-not-exist']

function publicSurfaceAudit() {
    return () => {
        const isVisible = (element: Element) => {
            const rect = element.getBoundingClientRect()
            const style = getComputedStyle(element)
            return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
        }

        const getName = (element: Element): string => {
            const ariaLabel = element.getAttribute('aria-label')
            if (ariaLabel?.trim()) return ariaLabel.trim()

            const labelledBy = element.getAttribute('aria-labelledby')
            if (labelledBy) {
                const text = labelledBy
                    .split(/\s+/)
                    .map((id) => document.getElementById(id)?.textContent ?? '')
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                if (text) return text
            }

            if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
                if (element.id) {
                    const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`)
                    if (label?.textContent?.trim()) return label.textContent.trim()
                }

                const parentLabel = element.closest('label')
                if (parentLabel?.textContent?.trim()) return parentLabel.textContent.trim()
            }

            return (element.textContent ?? '').replace(/\s+/g, ' ').trim()
        }

        return {
            hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
            unnamed: [...document.querySelectorAll('a,button,input,select,textarea')]
                .filter((element) => isVisible(element) && !getName(element))
                .map((element) => element.outerHTML.slice(0, 180)),
        }
    }
}

test.describe('public accessibility audit', () => {
    for (const width of [390, 1280]) {
        for (const route of routes) {
            test(`${route} has named controls and no horizontal overflow at ${width}px`, async ({ page }) => {
                await page.setViewportSize({ width, height: 844 })
                await page.goto(route)
                await expect(page.locator('body')).toBeVisible()

                const audit = await page.evaluate(publicSurfaceAudit())
                expect(audit.hasHorizontalOverflow).toBe(false)
                expect(audit.unnamed).toEqual([])

                const focusable = page.locator('a:visible,button:visible,input:visible,select:visible,textarea:visible,[tabindex]:not([tabindex="-1"]):visible')
                const focusableCount = await focusable.count()
                expect(focusableCount).toBeGreaterThan(0)
            })
        }
    }
})
