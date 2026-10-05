import { expect, Page, test } from '@playwright/test'

const authStorageState = process.env['PLAYWRIGHT_AUTH_STORAGE_STATE']
const groupId = process.env['PLAYWRIGHT_GROUP_ID']
const sessionId = process.env['PLAYWRIGHT_SESSION_ID']

// Admin pages need an admin storage state: set PLAYWRIGHT_AUDIT_ADMIN=1 to include them.
const adminRoutes = process.env['PLAYWRIGHT_AUDIT_ADMIN'] ? ['/admin/panel', '/admin/proposals', '/admin/manage-games', '/admin/manage-tags'] : []
const coreRoutes = ['/groups/:groupId', '/groups/:groupId/edit', '/groups/:groupId/sessions/new', '/collection', '/play/upcoming-sessions', '/play/history', '/settings/profile', '/settings/appearance', '/settings/security']

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

async function assertKeyboardTraversal(page: Page, route: string, width: number): Promise<void> {
    const focusableControlCount = await page.evaluate(() => {
        const isVisible = (element: Element) => {
            const rect = element.getBoundingClientRect()
            const style = getComputedStyle(element)
            return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
        }
        // A radio group is one Tab stop (arrow keys move inside it), so count each group once.
        const radioGroups = new Set<string>()
        const focusable = Array.from(document.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(element => {
            if (!isVisible(element) || element.hasAttribute('disabled')) return false
            if (element instanceof HTMLInputElement && element.type === 'radio' && element.name) {
                if (radioGroups.has(element.name)) return false
                radioGroups.add(element.name)
            }
            return true
        })
        const firstFocusable = focusable[0]
        if (!(firstFocusable instanceof HTMLElement)) return 0
        firstFocusable.focus()
        return document.activeElement === firstFocusable ? focusable.length : 0
    })

    expect(focusableControlCount, `${route} has no visible keyboard starting point at ${width}px`).toBeGreaterThan(0)
    const tabBudget = Math.min(32, focusableControlCount as number)

    for (let index = 0; index < tabBudget; index += 1) {
        const focused = await page.evaluate(() => {
            const element = document.activeElement
            if (!(element instanceof HTMLElement) || element === document.body) return null

            const rect = element.getBoundingClientRect()
            const style = getComputedStyle(element)
            const associatedLabel =
                element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement
                    ? (element.id ? document.querySelector(`label[for="${CSS.escape(element.id)}"]`)?.textContent : element.closest('label')?.textContent)
                    : null
            return {
                tagName: element.tagName,
                name:
                    element.getAttribute('aria-label') ||
                    associatedLabel?.replace(/\s+/g, ' ').trim() ||
                    element.textContent?.replace(/\s+/g, ' ').trim() ||
                    '',
                visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden',
            }
        })

        expect(focused, `${route} lost focus during keyboard traversal at ${width}px after ${index + 1} tabs`).not.toBeNull()
        expect(focused?.visible, `${route} focused an invisible control at ${width}px after ${index + 1} tabs`).toBe(true)
        expect(focused?.name, `${route} focused an unnamed control at ${width}px after ${index + 1} tabs`).toBeTruthy()
        await page.keyboard.press('Tab')
    }
}

test.describe('rendered core route audit', () => {
    test.skip(!authStorageState || !groupId, 'Set local Clerk auth state and a disposable group ID to run the rendered core audit.')
    test.use({ storageState: authStorageState })

    test('keeps primary routes usable at core breakpoints', async ({ page }) => {
        // Every route at every width: give it room as the list grows.
        test.setTimeout(180_000)
        const routes = [...coreRoutes, ...adminRoutes, ...(sessionId ? [`/sessions/${sessionId}`] : [])].map(route => route.replace(':groupId', groupId!))

        for (const width of [375, 768, 1280]) {
            await page.setViewportSize({ width, height: 900 })

            for (const route of routes) {
                await page.goto(route)
                await page.locator('main').first().waitFor({ state: 'visible' })
                await page.waitForTimeout(350)

                const audit = await page.evaluate(accessibleNameScript())
                expect(audit.overflow, `${route} overflows at ${width}px`).toBe(false)
                expect(audit.unnamed, `${route} has unnamed visible controls at ${width}px`).toEqual([])

                await assertKeyboardTraversal(page, route, width)
            }
        }
    })
})
