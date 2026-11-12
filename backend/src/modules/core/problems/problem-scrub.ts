import { createHash } from 'node:crypto'

/** Longest kept text of each kind; longer text is cut (ADR-0028). */
export const PROBLEM_LIMITS = { name: 80, message: 500, stack: 4000, endpoint: 160 } as const

/**
 * Takes out of a problem's text what could name someone or open something: email addresses, sign-in tokens, the query
 * and fragment of addresses, and long numbers and UUIDs (ids, phone numbers). Stack line and column numbers stay, since
 * they are short and are what a stack is for. Runs on the API for every report, whatever the browser sent.
 */
export function scrubProblemText(text: string, limit: number): string {
    const scrubbed = text
        .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]')
        .replace(/\beyJ[\w-]{6,}\.[\w-]{6,}\.[\w-]*/g, '[token]')
        .replace(/\b(Bearer|Basic)\s+[\w.~+/=-]+/gi, '$1 [token]')
        .replace(/(https?:\/\/[^\s?#)"',]*)[?#][^\s)"',]*/g, '$1')
        .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[id]')
        .replace(/(?<![\d:.])\d{4,}(?![\d:])/g, '#')

    return scrubbed.length > limit ? `${scrubbed.slice(0, limit - 1)}…` : scrubbed
}

/**
 * An API path as a template: `/dashboard/users/12/groups/3/shelf` becomes `/dashboard/users/:id/groups/:id/shelf`,
 * so a report never carries an id. Anything that is not a plain path is dropped.
 */
export function endpointTemplate(method: string, path: string): string | null {
    const verb = method.toUpperCase()

    if (!/^(GET|HEAD|POST|PUT|PATCH|DELETE)$/.test(verb)) return null
    const template = path
        .split(/[?#]/)[0]!
        .split('/')
        .map(segment => (/^\d+$/.test(segment) || /^[0-9a-f-]{32,36}$/i.test(segment) ? ':id' : segment))
        .join('/')

    if (!/^(\/[A-Za-z0-9:_.-]*)+$/.test(template)) return null
    const endpoint = `${verb} ${template}`

    return endpoint.length <= PROBLEM_LIMITS.endpoint ? endpoint : null
}

/**
 * The browser as a family, its major version and the system, "Chrome 131 · Android", never the whole user agent: enough
 * to tell a Safari-only problem, far too coarse to tell people apart.
 */
export function browserFamily(userAgent: string | undefined): string | null {
    if (!userAgent) return null
    const version = (pattern: RegExp) => userAgent.match(pattern)?.[1]
    const browser =
        (version(/Edg(?:e|A|iOS)?\/(\d+)/) && `Edge ${version(/Edg(?:e|A|iOS)?\/(\d+)/)}`) ||
        (version(/(?:OPR|Opera)\/(\d+)/) && `Opera ${version(/(?:OPR|Opera)\/(\d+)/)}`) ||
        (version(/SamsungBrowser\/(\d+)/) && `Samsung Internet ${version(/SamsungBrowser\/(\d+)/)}`) ||
        (version(/(?:Firefox|FxiOS)\/(\d+)/) && `Firefox ${version(/(?:Firefox|FxiOS)\/(\d+)/)}`) ||
        (version(/(?:Chrome|CriOS)\/(\d+)/) && `Chrome ${version(/(?:Chrome|CriOS)\/(\d+)/)}`) ||
        (/Safari\//.test(userAgent) && version(/Version\/(\d+)/) && `Safari ${version(/Version\/(\d+)/)}`) ||
        'Other'
    const system = /iPhone|iPad|iPod/.test(userAgent)
        ? 'iOS'
        : /Android/.test(userAgent)
          ? 'Android'
          : /Windows/.test(userAgent)
            ? 'Windows'
            : /Mac OS X|Macintosh/.test(userAgent)
              ? 'macOS'
              : /CrOS/.test(userAgent)
                ? 'ChromeOS'
                : /Linux/.test(userAgent)
                  ? 'Linux'
                  : null

    return system ? `${browser} · ${system}` : browser
}

/**
 * Which problem this is, so the same one on the same day adds to one row: where it happened and what it says, with the
 * numbers taken out so "12 items" and "13 items" count as one.
 */
export function problemFingerprint(parts: {
    source: string
    kind: string
    name: string
    message: string
    view: string | null
    endpoint: string | null
    status: number | null
}): string {
    const message = parts.message.replace(/\d+/g, '#')

    return createHash('sha256')
        .update(JSON.stringify([parts.source, parts.kind, parts.name, message, parts.view, parts.endpoint, parts.status]))
        .digest('hex')
        .slice(0, 32)
}
