import type { Page, Request, Route } from '@playwright/test'

/**
 * How the fake network answers a call to the API:
 * - `pass`: the real API answers, after `latencyMs` if given;
 * - `down`: the connection is refused, as when the API is not running;
 * - `503`: the API's error envelope for a database that stopped answering (`DATABASE_TIMEOUT`);
 * - `hang`: no answer ever comes, so only the app's own timeout ends the wait.
 */
export type ChaosMode = 'pass' | 'down' | '503' | 'hang'

export type ChaosRule = { mode: ChaosMode; latencyMs?: number }

type Override = { path: RegExp; rule: ChaosRule }

/** The API calls that let the account be known at boot; everything else is what a page loads afterwards. */
export const SIGN_IN_PATHS = /^\/(auth\/clerk\/status|profile\/users\/\d+)$/

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

/**
 * Sends every call to the API through one `page.route` that answers by the current mode (#248).
 *
 * The mode can change mid-test (`set`), and `override` makes some paths answer differently, for example only
 * `/dashboard/users/:id/group-overviews` failing. Overrides live in this one handler, checked newest first, instead of in
 * separate `page.route` calls: Playwright runs the last registered handler first, so a catch-all added after an
 * override would hide it. Override patterns must not use the `g` or `y` flag, which make `test()` stateful.
 */
export class ChaosApi {
    private rule: ChaosRule = { mode: 'pass' }
    private overrides: Array<Override> = []
    private readonly inFlight = new Set<Request>()
    private lastActivity = Date.now()
    /** Calls this handler answered by a rule other than `pass`: proof the chaos reached the app. */
    faked = 0

    private constructor(
        private readonly page: Page,
        private readonly port: string,
    ) {}

    /**
     * Intercepts calls to the API's port on any loopback host, so `localhost` and `127.0.0.1` cannot slip past each
     * other and leave a test running against the real API.
     */
    static async install(page: Page, origin: string, rule: ChaosRule = { mode: 'pass' }): Promise<ChaosApi> {
        const chaos = new ChaosApi(page, new URL(origin).port)
        chaos.rule = rule
        const isApi = (url: URL) => url.port === chaos.port && LOOPBACK_HOSTS.has(url.hostname)

        page.on('request', (request) => {
            if (!isApi(new URL(request.url()))) return
            chaos.inFlight.add(request)
            chaos.lastActivity = Date.now()
        })
        const settle = (request: Request) => {
            if (!chaos.inFlight.delete(request)) return
            chaos.lastActivity = Date.now()
        }
        page.on('requestfinished', settle)
        // A hung call ends here too, once the app gives up on it and the browser cancels it.
        page.on('requestfailed', settle)

        await page.route(isApi, (route) => chaos.handle(route))
        return chaos
    }

    /** Changes how every call without an override is answered, from the next call on. */
    set(rule: ChaosRule): this {
        this.rule = rule
        return this
    }

    /** Answers calls whose path (no query) matches `path` with `rule`, ahead of the default and older overrides. */
    override(path: RegExp, rule: ChaosRule): this {
        this.overrides.unshift({ path, rule })
        return this
    }

    /**
     * Resolves once no call to the API has been open for `quietMs`: every load has been answered, refused, or given up
     * on by the app (a hung call is cancelled by the app's timeout). Throws after `timeoutMs`.
     */
    async waitForQuiet(quietMs: number, timeoutMs: number): Promise<void> {
        const deadline = Date.now() + timeoutMs
        while (Date.now() < deadline) {
            if (this.inFlight.size === 0 && Date.now() - this.lastActivity >= quietMs) return
            await new Promise((resolve) => setTimeout(resolve, 100))
        }
        throw new Error(`The API calls did not settle within ${timeoutMs} ms (${this.inFlight.size} still open)`)
    }

    /** Stops intercepting. Calls left hanging are dropped without failing the test. */
    async dispose(): Promise<void> {
        await this.page.unrouteAll({ behavior: 'ignoreErrors' })
    }

    private ruleFor(request: Request): ChaosRule {
        const path = new URL(request.url()).pathname
        return this.overrides.find((override) => override.path.test(path))?.rule ?? this.rule
    }

    private async handle(route: Route): Promise<void> {
        const request = route.request()
        const rule = this.ruleFor(request)

        // A preflight only asks whether the real call may be sent. Answer it so the browser sends that call and
        // the mode applies to it. (Chromium usually answers preflights itself while requests are intercepted.)
        if (request.method() === 'OPTIONS') {
            if (rule.mode === 'pass') await route.continue().catch(() => undefined)
            else await route.fulfill({ status: 204, headers: corsHeaders(request) }).catch(() => undefined)
            return
        }

        if (rule.latencyMs) await new Promise((resolve) => setTimeout(resolve, rule.latencyMs))
        if (rule.mode !== 'pass') this.faked++

        switch (rule.mode) {
            case 'pass':
                await route.continue().catch(() => undefined)
                return
            case 'down':
                await route.abort('connectionrefused').catch(() => undefined)
                return
            case '503':
                await route
                    .fulfill({
                        status: 503,
                        contentType: 'application/json',
                        headers: { ...corsHeaders(request), 'X-Request-Id': 'chaos-test' },
                        body: JSON.stringify({
                            statusCode: 503,
                            code: 'DATABASE_TIMEOUT',
                            message: 'A service the app depends on is slow to respond. Try again in a moment.',
                            requestId: 'chaos-test',
                        }),
                    })
                    .catch(() => undefined)
                return
            case 'hang':
                // Never answered: the app's timeout cancels the call, and dispose() drops the route.
                return
        }
    }
}

/** What the real API's CORS answers with, so a faked answer reaches the app instead of failing as a CORS error. */
function corsHeaders(request: Request): Record<string, string> {
    const origin = request.headers()['origin'] ?? '*'
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] ?? '*',
        'Access-Control-Expose-Headers': 'X-Request-Id',
        Vary: 'Origin',
    }
}
