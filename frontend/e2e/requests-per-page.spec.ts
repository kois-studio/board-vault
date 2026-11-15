import { expect, type Page, test } from '@playwright/test'
import { ChaosApi, SIGN_IN_PATHS } from './fixtures/chaos-api'

/**
 * #263: a page reads the lists it shows, not every list of the account. Counts the API reads of a cold load per
 * route, with #248's helper passing every call through to the real API, and checks that going back to a page shows
 * what is kept without reading it again. See docs/adr/0029-lists-loaded-when-shown.md.
 *
 * Needs PLAYWRIGHT_AUTH_STORAGE_STATE (the organizer) and the local API with the `npm run local:setup` fixtures.
 * Nothing is written.
 */
const storageState = process.env['PLAYWRIGHT_AUTH_STORAGE_STATE']
const apiOrigin = process.env['PLAYWRIGHT_API_ORIGIN'] ?? 'http://localhost:3000'

/** No call to the API open for this long means the page has read what it reads on load. */
const QUIET_MS = 2_000
const SETTLES_MS = 30_000

/** The account's lists `DataService` keeps, by the path that reads each one (`:me` is the signed-in account). */
const LISTS: Record<string, string> = {
    games: '/collection/users/:me/games',
    groups: '/dashboard/users/:me/group-overviews',
    notifications: '/profile/users/:me/notifications',
    invitations: '/profile/users/:me/invitations',
    reviews: '/collection/users/:me/reviews',
    meets: '/play/users/:me/meets',
    history: '/play/users/:me/history/page',
    historySummary: '/play/users/:me/history/summary',
    wishlist: '/collection/users/:me/wishlist',
    collectionActivity: '/collection/users/:me/recent-activity',
    proposals: '/profile/users/:me/proposals',
    proposalStats: '/profile/users/:me/proposal-stats',
    stats: '/dashboard/users/:me/stats',
}
const LIST_OF_PATH = new Map(Object.entries(LISTS).map(([list, path]) => [path, list]))
/** The header's inbox, on every signed-in page. */
const SHELL = ['notifications', 'invitations']

/**
 * The lists a cold load of each page reads, beyond the inbox. Before #263 every one of them read all 13, plus the
 * invitations of each group the account owns.
 */
const PAGES: Array<{ path: string; lists: Array<string> }> = [
    { path: '/settings/profile', lists: [] },
    // Reviews: each recent night on Home asks you to rate its games, unless you already have.
    { path: '/dashboard', lists: ['games', 'groups', 'history', 'historySummary', 'meets', 'reviews'] },
    { path: '/collection', lists: ['collectionActivity', 'games', 'reviews', 'wishlist'] },
    { path: '/collection/games', lists: ['games'] },
    { path: '/collection/wishlist', lists: ['wishlist'] },
    { path: '/submissions', lists: ['proposalStats', 'proposals'] },
    { path: '/play', lists: ['groups', 'history', 'historySummary', 'meets'] },
    { path: '/you', lists: ['games', 'groups', 'historySummary', 'reviews', 'stats'] },
]

/** Records every API read after the account is known, as a path with the account id as `:me`. */
class Reads {
    readonly paths: Array<string> = []

    constructor(page: Page) {
        const port = new URL(apiOrigin).port
        page.on('request', (request) => {
            const url = new URL(request.url())
            if (url.port !== port || request.method() !== 'GET' || SIGN_IN_PATHS.test(url.pathname)) return
            this.paths.push(url.pathname)
        })
    }

    /** The account's lists read so far, in order, each as often as it was read. */
    lists(me: string): Array<string> {
        return this.paths.flatMap((path) => {
            const list = LIST_OF_PATH.get(path.replace(`/users/${me}/`, '/users/:me/'))
            return list ? [list] : []
        })
    }
}

/** The signed-in account's id, from the account check the app makes at boot. */
async function accountId(page: Page): Promise<string> {
    const port = new URL(apiOrigin).port
    const response = await page.waitForResponse((answer) => {
        const url = new URL(answer.url())
        return url.port === port && /^\/profile\/users\/\d+$/.test(url.pathname)
    })
    return new URL(response.url()).pathname.split('/').at(-1) ?? ''
}

test.describe('requests per page (#263)', () => {
    test.skip(!storageState, 'Set PLAYWRIGHT_AUTH_STORAGE_STATE to a local disposable Clerk storage-state file.')
    test.use({ storageState })

    let chaos: ChaosApi | undefined
    test.afterEach(async () => {
        await chaos?.dispose()
        chaos = undefined
    })

    for (const route of PAGES) {
        test(`a cold ${route.path} reads only the lists it shows`, async ({ page }) => {
            test.setTimeout(60_000)
            chaos = await ChaosApi.install(page, apiOrigin)
            const reads = new Reads(page)
            const me = accountId(page)

            await page.goto(route.path, { waitUntil: 'domcontentloaded' })
            const id = await me
            await chaos.waitForQuiet(QUIET_MS, SETTLES_MS)

            const lists = reads.lists(id)
            expect([...lists].sort(), `lists read by ${route.path}`).toEqual([...SHELL, ...route.lists].sort())
            // Each once: a list two parts of the page show is read once and shared.
            expect(new Set(lists).size, `a list read twice by ${route.path}: ${lists.join(', ')}`).toBe(lists.length)
        })
    }

    test('a cold /settings/profile sends nothing beyond what every signed-in page reads', async ({ page }) => {
        test.setTimeout(60_000)
        chaos = await ChaosApi.install(page, apiOrigin)
        const reads = new Reads(page)
        const me = accountId(page)

        await page.goto('/settings/profile', { waitUntil: 'domcontentloaded' })
        const id = await me
        await chaos.waitForQuiet(QUIET_MS, SETTLES_MS)

        // The inbox in the header, and the usage notice asking once per visit whether it may count (ADR-0021).
        expect(reads.paths.map((path) => path.replace(`/users/${id}/`, '/users/:me/')).sort()).toEqual(
            [LISTS['invitations'], LISTS['notifications'], '/settings/privacy'].sort(),
        )
    })

    test('going back to a page shows what is kept at once, without reading it again', async ({ page }) => {
        test.setTimeout(60_000)
        chaos = await ChaosApi.install(page, apiOrigin)
        const reads = new Reads(page)
        const me = accountId(page)
        const sections = page.getByRole('navigation', { name: 'Section navigation' })

        await page.goto('/collection', { waitUntil: 'domcontentloaded' })
        const id = await me
        await chaos.waitForQuiet(QUIET_MS, SETTLES_MS)
        const first = reads.lists(id).length

        await sections.getByRole('link', { name: 'Play', exact: true }).click()
        await expect(page).toHaveURL(/\/play$/)
        await chaos.waitForQuiet(QUIET_MS, SETTLES_MS)
        const afterPlay = reads.lists(id)

        await page.goBack()
        await expect(page).toHaveURL(/\/collection$/)
        // Shown from what is kept: no badge waits for a count.
        await expect(page.getByRole('main').getByText('Loading…')).toHaveCount(0)
        await chaos.waitForQuiet(QUIET_MS, SETTLES_MS)

        // Within FRESH_FOR_MS of the first load, nothing is read again.
        expect(reads.lists(id)).toEqual(afterPlay)
        expect(afterPlay.slice(first)).toEqual(expect.not.arrayContaining(['games', 'reviews', 'wishlist', 'collectionActivity']))
    })
})
