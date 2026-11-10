import { expect, type Page, test } from '@playwright/test'
import { ChaosApi, type ChaosMode, SIGN_IN_PATHS } from './fixtures/chaos-api'

/**
 * #248: every signed-in page survives the API being down, answering 503, hanging, or slow. The user always sees
 * content, a skeleton, or an alert with a way to try again: never a blank page, a spinner that never ends, or an
 * empty state that is really a failed load. See docs/how-to/run-with-clerk.md.
 *
 * Needs PLAYWRIGHT_AUTH_STORAGE_STATE (the organizer) and the local API with the `npm run local:setup` fixtures; the
 * ids below default to them. Nothing is written: the one write tried is answered by the fake network.
 */
const storageState = process.env['PLAYWRIGHT_AUTH_STORAGE_STATE']
const apiOrigin = process.env['PLAYWRIGHT_API_ORIGIN'] ?? 'http://localhost:3000'
const groupId = process.env['PLAYWRIGHT_GROUP_ID'] ?? '1'
const sessionId = process.env['PLAYWRIGHT_RESILIENCE_SESSION_ID'] ?? '1'
const gameId = process.env['PLAYWRIGHT_RESILIENCE_GAME_ID'] ?? '1'
const memberAccountId = process.env['PLAYWRIGHT_RESILIENCE_MEMBER_ACCOUNT_ID'] ?? '2'
const personId = process.env['PLAYWRIGHT_RESILIENCE_PERSON_ID'] ?? '1'

/**
 * No call to the API open for this long means every load was answered, refused, or given up on. A failed read is
 * retried 1 s later, so the window is longer than that.
 */
const QUIET_MS = 2_500
/** A hung read times out after 12 s, is retried once after 1 s, and times out again: about 25 s per wave of reads. */
const HANG_SETTLES_MS = 90_000
const FAIL_SETTLES_MS = 30_000
/** How long the page may take to show something at all: Clerk loads first, then the account is resolved. */
const FIRST_PAINT_MS = 20_000

type SignedInRoute = {
    path: string
    /** Texts that mean "you have nothing here". Shown after a failed load, they would tell the user something false. */
    emptyStates: Array<string>
    /** The page loads its own data and says, in its own role="alert" with a button to try again, when that fails. */
    ownAlert: boolean
}

// Every route in app.routes.ts behind AuthOnlyGuard. Redirects (/groups, /meets/:id, /groups/:id/meets/new,
// /settings/security) land on one of these; /groups/:id/leave and /delete only redirect to the group page; admin
// pages need an admin account.
const ROUTES: Array<SignedInRoute> = [
    { path: '/dashboard', ownAlert: true, emptyStates: ['Start with the people you play with', 'Nothing recorded yet'] },
    { path: '/submissions', ownAlert: true, emptyStates: ['No proposals yet'] },
    { path: '/collection', ownAlert: false, emptyStates: [] },
    { path: '/collection/games', ownAlert: true, emptyStates: ['Start with the games you actually bring to the table'] },
    { path: '/collection/browse', ownAlert: true, emptyStates: ['No games found matching', 'No games match these filters'] },
    { path: '/collection/reviews', ownAlert: true, emptyStates: ['You haven’t rated any games yet'] },
    { path: '/collection/wishlist', ownAlert: true, emptyStates: ['Nothing on your wishlist yet'] },
    {
        path: `/games/${gameId}`,
        ownAlert: true,
        emptyStates: ['Nobody in your groups owns it yet', 'You haven’t played it in a recorded session yet'],
    },
    { path: '/play', ownAlert: false, emptyStates: ['Nothing planned yet', 'No sessions recorded yet'] },
    { path: '/play/recommendations', ownAlert: true, emptyStates: ['Create or join a group first'] },
    { path: '/play/log-session', ownAlert: true, emptyStates: [] },
    {
        path: '/play/upcoming-sessions',
        ownAlert: true,
        emptyStates: ['No game nights planned', 'Create or join a group before planning a session'],
    },
    { path: '/play/history', ownAlert: true, emptyStates: ['No game nights recorded yet'] },
    { path: '/you', ownAlert: false, emptyStates: ['You are not in a group yet', 'No finished nights yet'] },
    {
        path: `/groups/${groupId}`,
        ownAlert: true,
        emptyStates: [
            'This group is not available',
            'Nothing planned yet',
            'No games in this group yet',
            'No group profiles yet',
            'No winners recorded yet',
            'No group acquisition ideas yet',
        ],
    },
    {
        path: `/groups/${groupId}/members/${memberAccountId}`,
        ownAlert: true,
        emptyStates: [
            'This person is not in this group',
            'They bring no games to this group yet',
            'No finished game nights with this group yet',
            'No games on the shelf yet',
        ],
    },
    { path: `/groups/${groupId}/people/${personId}`, ownAlert: true, emptyStates: ['This person is not in this group'] },
    {
        path: `/sessions/${sessionId}`,
        ownAlert: true,
        emptyStates: ['Nothing marked yet', 'No games shortlisted yet', 'Nobody is coming yet'],
    },
    { path: '/settings', ownAlert: false, emptyStates: [] },
    { path: '/settings/profile', ownAlert: false, emptyStates: [] },
    { path: '/settings/appearance', ownAlert: false, emptyStates: [] },
    { path: '/settings/language', ownAlert: false, emptyStates: [] },
    { path: '/settings/account', ownAlert: false, emptyStates: [] },
    { path: '/settings/privacy', ownAlert: true, emptyStates: [] },
    { path: '/create-group', ownAlert: false, emptyStates: [] },
    {
        path: `/groups/${groupId}/sessions/new`,
        ownAlert: true,
        emptyStates: ['Nobody in this group yet', 'Nobody in this group has games in Board Vault yet'],
    },
    { path: `/groups/${groupId}/edit`, ownAlert: true, emptyStates: ['This group is not available'] },
    { path: `/groups/${groupId}/people/${personId}/claim`, ownAlert: true, emptyStates: ['This handoff is unavailable'] },
    { path: '/collection/propose-game', ownAlert: false, emptyStates: [] },
]

function routeAt(path: string): SignedInRoute {
    const route = ROUTES.find((candidate) => candidate.path === path)
    if (!route) throw new Error(`No route ${path} in ROUTES`)
    return route
}

const FAILURE_MODES: Array<Exclude<ChaosMode, 'pass'>> = ['down', '503', 'hang']

const main = (page: Page) => page.locator('main#main-content')
const connecting = (page: Page) => page.getByRole('heading', { name: /^Connecting you to your Board Vault/ })
const outage = (page: Page) => page.getByRole('heading', { name: 'We can’t reach Board Vault right now' })
const signInFailed = (page: Page) => page.getByRole('heading', { name: /^We could not finish (setting up your sign-in|joining this group)/ })
const banner = (page: Page) => page.getByTestId('connectivity-banner')
const retryButtons = (page: Page) => page.getByRole('button', { name: /^(Retry|Try again|Reload)\b/ })

/** The page is not blank: `<main>` holds something a person can read. */
async function expectNotBlank(page: Page, timeout = 5_000): Promise<void> {
    await expect(main(page)).toBeVisible({ timeout })
    await expect
        .poll(async () => (await main(page).innerText()).trim().length, { message: '<main> is blank', timeout })
        .toBeGreaterThan(0)
}

/** Once every call has been answered or given up on, nothing in the page may still say it is waiting. */
async function expectNothingStillLoading(page: Page): Promise<void> {
    await expect(main(page).getByText(/^Loading\b.*…$/), 'a loading text never ended').toHaveCount(0, { timeout: 5_000 })
    await expect(main(page).locator('[aria-busy="true"]'), 'a loading placeholder never ended').toHaveCount(0, { timeout: 5_000 })
}

async function expectNoEmptyStates(page: Page, route: SignedInRoute): Promise<void> {
    for (const text of route.emptyStates) {
        await expect(main(page).getByText(text), `"${text}" is shown although the load failed`).toHaveCount(0)
    }
}

test.describe('resilience: every signed-in page survives the API failing', () => {
    test.skip(!storageState, 'Set PLAYWRIGHT_AUTH_STORAGE_STATE to a local disposable Clerk storage-state file.')
    test.use({ storageState })

    let chaos: ChaosApi | undefined
    test.afterEach(async () => {
        await chaos?.dispose()
        chaos = undefined
    })

    // The whole API fails from the first call, so the account cannot even be resolved: the handoff says Board Vault
    // cannot be reached, keeps the sign-in, and offers to try again (#238, #239). Never "could not finish setting up
    // your sign-in", which tells the person to sign out.
    for (const mode of FAILURE_MODES) {
        test.describe(`at boot, API ${mode}`, () => {
            for (const route of ROUTES) {
                test(route.path, async ({ page }) => {
                    test.setTimeout(60_000)
                    chaos = await ChaosApi.install(page, apiOrigin, { mode })

                    await page.goto(route.path, { waitUntil: 'domcontentloaded' })
                    await expectNotBlank(page, FIRST_PAINT_MS)

                    // The account check is not retried by the client and gives up after 12 s when nothing answers.
                    await expect(outage(page)).toBeVisible({ timeout: mode === 'hang' ? FIRST_PAINT_MS + 15_000 : FIRST_PAINT_MS })
                    await expect(main(page).getByRole('alert')).toBeVisible()
                    await expect(main(page).getByRole('button', { name: 'Try again', exact: true })).toBeVisible()
                    await expect(main(page).getByRole('button', { name: 'Sign out', exact: true })).toBeVisible()
                    await expect(signInFailed(page)).toHaveCount(0)
                    await expect(connecting(page)).toHaveCount(0)
                    expect(chaos.faked).toBeGreaterThan(0)
                })
            }
        })
    }

    // The account is resolved, then everything the page loads fails: the realistic outage in the middle of a
    // visit, and where an empty state would lie.
    for (const mode of FAILURE_MODES) {
        test.describe(`after sign-in, page data ${mode}`, () => {
            for (const route of ROUTES) {
                test(route.path, async ({ page }) => {
                    test.setTimeout(mode === 'hang' ? 150_000 : 75_000)
                    chaos = await ChaosApi.install(page, apiOrigin, { mode })
                    chaos.override(SIGN_IN_PATHS, { mode: 'pass' })

                    await page.goto(route.path, { waitUntil: 'domcontentloaded' })
                    await expectNotBlank(page, FIRST_PAINT_MS)
                    await expect(connecting(page)).toHaveCount(0, { timeout: FIRST_PAINT_MS })
                    await expect(outage(page)).toHaveCount(0)
                    await expect(signInFailed(page)).toHaveCount(0)

                    // Every read fails or is given up on; then the page must have stopped waiting and say so.
                    await chaos.waitForQuiet(QUIET_MS, mode === 'hang' ? HANG_SETTLES_MS : FAIL_SETTLES_MS)
                    expect(chaos.faked).toBeGreaterThan(0)
                    await expectNotBlank(page)
                    await expectNothingStillLoading(page)
                    // The failed reads must not have sent the person back to the sign-in screens either.
                    await expect(outage(page)).toHaveCount(0)
                    await expect(signInFailed(page)).toHaveCount(0)
                    // Every page shows the banner while Board Vault is away; a page with its own data also says,
                    // where that data would be, that it could not be loaded.
                    await expect(banner(page)).toBeVisible({ timeout: 5_000 })
                    if (route.ownAlert) {
                        await expect(main(page).getByRole('alert').filter({ has: retryButtons(page) }).first()).toBeVisible({ timeout: 5_000 })
                    }
                    await expectNoEmptyStates(page, route)
                })
            }
        })
    }

    // A slow API (300 ms on every call, as in the audit of 2026-11-07) shows each page, without the outage notices.
    test.describe('slow API', () => {
        for (const route of ROUTES) {
            test(route.path, async ({ page }) => {
                test.setTimeout(75_000)
                chaos = await ChaosApi.install(page, apiOrigin, { mode: 'pass', latencyMs: 300 })

                await page.goto(route.path, { waitUntil: 'domcontentloaded' })
                await expectNotBlank(page, FIRST_PAINT_MS)
                await expect(connecting(page)).toHaveCount(0, { timeout: FIRST_PAINT_MS + 10_000 })
                await chaos.waitForQuiet(QUIET_MS, FAIL_SETTLES_MS)
                await expect(outage(page)).toHaveCount(0)
                await expectNotBlank(page)
                await expectNothingStillLoading(page)
                await expect(banner(page)).toHaveCount(0)
            })
        }
    })

    test('recovers: once Board Vault answers again, Retry brings the page back', async ({ page }) => {
        test.setTimeout(75_000)
        chaos = await ChaosApi.install(page, apiOrigin, { mode: '503' })
        chaos.override(SIGN_IN_PATHS, { mode: 'pass' })

        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
        const groupsFailed = main(page).getByRole('alert').filter({ hasText: 'Your groups could not be loaded.' })
        await expect(groupsFailed).toBeVisible({ timeout: FIRST_PAINT_MS + 10_000 })

        chaos.set({ mode: 'pass' })
        await groupsFailed.getByRole('button', { name: 'Retry', exact: true }).click()

        await expect(groupsFailed).toHaveCount(0, { timeout: 15_000 })
        await expect(main(page).getByRole('heading', { name: /^Your groups?$/ })).toBeVisible({ timeout: 15_000 })
    })

    test('mid-session: Board Vault starts answering 503, and a failed write is shown where the person acted', async ({ page }) => {
        test.setTimeout(90_000)
        chaos = await ChaosApi.install(page, apiOrigin, { mode: 'pass' })

        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
        await expect(page.getByRole('heading', { level: 1, name: /^(Hi|Welcome)\b/ })).toBeVisible({ timeout: FIRST_PAINT_MS })
        await expect(page.getByRole('link', { name: '+ New group' })).toBeVisible({ timeout: 15_000 })
        await chaos.waitForQuiet(QUIET_MS, FAIL_SETTLES_MS)

        chaos.set({ mode: '503' })

        // One write, reached by moving inside the app (no reload): creating a group. The 503 comes from the fake
        // network, so nothing reaches the database.
        await page.getByRole('link', { name: '+ New group' }).click()
        await expect(page).toHaveURL(/\/create-group$/)

        const name = page.getByLabel('What should your group be called?')
        await name.fill('Chaos test group')
        await page.getByRole('button', { name: 'Create group', exact: true }).click()

        const form = page.locator('form').filter({ has: name })
        await expect(form.getByRole('alert').filter({ hasText: /\S/ })).toBeVisible({ timeout: 25_000 })
        await expect(name).toHaveValue('Chaos test group')
        await expect(page.getByRole('button', { name: 'Create group', exact: true })).toBeEnabled()
        await expect(page).toHaveURL(/\/create-group$/)
        expect(chaos.faked).toBeGreaterThan(0)

        // Back on Home and on to a page that loads its own data: told, never shown as empty.
        await page.goBack()
        await expect(page).toHaveURL(/\/dashboard$/)
        await chaos.waitForQuiet(QUIET_MS, FAIL_SETTLES_MS)
        await expectNotBlank(page)
        await expectNothingStillLoading(page)
        await expectNoEmptyStates(page, routeAt('/dashboard'))

        await page.locator('header a[href="/play"]').filter({ visible: true }).first().click()
        await expect(page).toHaveURL(/\/play$/)
        await chaos.waitForQuiet(QUIET_MS, FAIL_SETTLES_MS)
        await expectNotBlank(page)
        await expect(banner(page)).toBeVisible({ timeout: 10_000 })
        await expectNothingStillLoading(page)
        await expectNoEmptyStates(page, routeAt('/play'))
    })
})
