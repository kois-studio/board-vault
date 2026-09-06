import { expect, test } from '@playwright/test'

const authStorageState = process.env['PLAYWRIGHT_AUTH_STORAGE_STATE']
const groupId = process.env['PLAYWRIGHT_GROUP_ID']
const sessionId = process.env['PLAYWRIGHT_SESSION_ID']

const coreRoutes = ['/groups/:groupId', '/groups/:groupId/edit', '/groups/:groupId/sessions/new', '/collection', '/play/upcoming-sessions', '/play/history']

function accessibleNameScript() {
    return () => {
        const isVisible = (element: Element) => {
            const rect = element.getBoundingClientRect()
            const style = getComputedStyle(element)
            return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
        }

        const getName = (element: Element): string => {
            const ariaLabel = element.getAttribute('aria-label')
            if (ariaLabel?.trim()) return ariaLabel.trim()

            const title = element.getAttribute('title')
            if (title?.trim()) return title.trim()

            const labelledBy = element.getAttribute('aria-labelledby')
            if (labelledBy) {
                const labelledText = labelledBy
                    .split(/\s+/)
                    .map(id => document.getElementById(id)?.textContent ?? '')
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                if (labelledText) return labelledText
            }

            if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
                if (element.id) {
                    const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`)
                    if (label?.textContent?.trim()) return label.textContent.trim()
                }

                const parentLabel = element.closest('label')
                if (parentLabel?.textContent?.trim()) return parentLabel.textContent.trim()
            }

            const image = element.querySelector('img[alt]')
            if (image?.getAttribute('alt')?.trim()) return image.getAttribute('alt')!.trim()

            return (element.textContent ?? '').replace(/\s+/g, ' ').trim()
        }

        return {
            overflow: document.documentElement.scrollWidth > window.innerWidth,
            unnamed: [...document.querySelectorAll('button, a, input, select, textarea')]
                .filter(element => isVisible(element) && !getName(element))
                .map(element => element.outerHTML.slice(0, 180)),
        }
    }
}

test.describe('rendered core route audit', () => {
    test.skip(!authStorageState || !groupId, 'Set local Clerk auth state and a disposable group ID to run the rendered core audit.')
    test.use({ storageState: authStorageState })

    test('keeps primary routes usable at core breakpoints', async ({ page }) => {
        const routes = [...coreRoutes, ...(sessionId ? [`/sessions/${sessionId}`] : [])].map(route => route.replace(':groupId', groupId!))

        for (const width of [375, 768, 1280]) {
            await page.setViewportSize({ width, height: 900 })

            for (const route of routes) {
                await page.goto(route)
                await page.waitForTimeout(350)

                const audit = await page.evaluate(accessibleNameScript())
                expect(audit.overflow, `${route} overflows at ${width}px`).toBe(false)
                expect(audit.unnamed, `${route} has unnamed visible controls at ${width}px`).toEqual([])
            }
        }
    })
})
