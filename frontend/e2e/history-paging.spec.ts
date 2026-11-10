import { expect, type Route, test } from '@playwright/test'

/**
 * #252: History reads a page of nights at a time and its totals from the server, and still reaches the oldest night.
 * The two history routes are answered by the fake network with 25 nights, so this needs no history in the account
 * and writes nothing. Needs PLAYWRIGHT_AUTH_STORAGE_STATE, like the other signed-in journeys.
 */
const storageState = process.env['PLAYWRIGHT_AUTH_STORAGE_STATE']
const NIGHTS = 25

/** Night 125 is the newest; each is a day older than the one before. */
const night = (id: number) => ({
    meetData: {
        id,
        groupId: 999_001,
        createdBy: 1,
        meetDate: new Date(Date.UTC(2026, 5, 30 - (125 - id), 19)).toISOString(),
        isConfirmed: true,
        status: 'completed',
        timezone: 'UTC',
        notes: `Night ${id}`,
    },
    attendedBy: [],
    gamesPlayed: [],
})
const history = Array.from({ length: NIGHTS }, (_, index) => night(125 - index))

/** Answers as the API would, preflight included, so the browser accepts the fake answer. */
async function answer(route: Route, json: unknown): Promise<void> {
    const request = route.request()
    const headers = {
        'Access-Control-Allow-Origin': request.headers()['origin'] ?? '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] ?? '*',
        Vary: 'Origin',
    }
    if (request.method() === 'OPTIONS') await route.fulfill({ status: 204, headers })
    else await route.fulfill({ json, headers })
}

test.describe('history pages (#252)', () => {
    test.skip(!storageState, 'Set PLAYWRIGHT_AUTH_STORAGE_STATE to a local Clerk storage-state file to run authenticated journeys.')
    test.use({ storageState })

    test('shows the latest twenty nights, then the older ones on request, down to the oldest', async ({ page }) => {
        const befores: Array<string | null> = []
        await page.route(/\/play\/users\/\d+\/history\/page(\?|$)/, async (route) => {
            const params = new URL(route.request().url()).searchParams
            const before = params.get('before')
            const limit = Number(params.get('limit') ?? 20)
            const start = before === null ? 0 : history.findIndex((entry) => entry.meetData.id === Number(before)) + 1
            if (route.request().method() === 'GET') befores.push(before)
            await answer(route, { entries: history.slice(start, start + limit), hasMore: start + limit < history.length })
        })
        await page.route(/\/play\/users\/\d+\/history\/summary(\?|$)/, (route) =>
            answer(route, { nights: NIGHTS, gamesPlayed: 0, uniqueGames: 0, people: 0, mostPlayed: null, myMostPlayed: [] }),
        )

        await page.goto('/play/history')

        const sessions = page.locator('article')
        await expect(sessions).toHaveCount(20)
        await expect(page.getByText('Night 125', { exact: true })).toBeVisible()
        await expect(page.locator('dd').first()).toHaveText(String(NIGHTS))

        await page.getByRole('button', { name: 'Show older sessions (5)' }).click()

        await expect(sessions).toHaveCount(NIGHTS)
        await expect(page.getByText('Night 101', { exact: true })).toBeVisible()
        await expect(page.getByRole('button', { name: /Show older sessions/ })).toHaveCount(0)
        // The second page starts after the last night shown, never by an offset that a new night would shift.
        expect(befores).toEqual([null, '106'])
    })
})
