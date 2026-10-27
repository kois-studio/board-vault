/**
 * The interface languages (ADR-0024). Every build contains every supported language under its own
 * prefix (`/es/…`); only the offered ones appear in the language menu and in the redirect of an
 * address without a prefix, so a half-translated language is never shown to anyone who did not
 * type its address. Add a language to OFFERED_LOCALES once every message is translated.
 *
 * This file has no Angular imports: the Vercel middleware (`frontend/middleware.ts`) and
 * `scripts/serve-dist.mjs` use the same rules.
 */
export const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'it'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const SOURCE_LOCALE: Locale = 'en'
export const OFFERED_LOCALES: ReadonlyArray<Locale> = ['en']

/** Each language by its own name, as the language menu lists it: never translated. */
export const LOCALE_NAMES: Record<Locale, string> = {
    en: 'English',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
    it: 'Italiano',
}

/** The cookie an explicit language choice writes. It holds only the language code. */
export const LOCALE_COOKIE = 'bv_lang'

/** The cookie for a choice: the whole site, a year, sent on top-level navigations only. */
export function localeCookie(locale: Locale, secure: boolean): string {
    return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${secure ? '; Secure' : ''}`
}

/**
 * The languages the menu lists, in SUPPORTED_LOCALES order: the offered ones and the one the page is in (so
 * someone who typed an unfinished language's address can leave it), or every supported language in preview.
 */
export function menuLocales(current: Locale, preview: boolean, offered: ReadonlyArray<Locale> = OFFERED_LOCALES): Array<Locale> {
    return SUPPORTED_LOCALES.filter((locale) => preview || locale === current || offered.includes(locale))
}

/** The same page in another language: `/groups/12?tab=x` → `/es/groups/12?tab=x`, from a router URL. */
export function localizedUrl(locale: Locale, routerUrl: string): string {
    return `/${locale}${routerUrl.startsWith('/') ? routerUrl : `/${routerUrl}`}`
}

export function isSupportedLocale(value: unknown): value is Locale {
    return typeof value === 'string' && (SUPPORTED_LOCALES as ReadonlyArray<string>).includes(value)
}

/** The language a path is under (`/es/groups/1` → `es`), or null for a path without a prefix. */
export function localeOfPath(pathname: string): Locale | null {
    const first = pathname.split('/')[1]
    return isSupportedLocale(first) ? first : null
}

/** Reads one cookie from a `Cookie` header. */
export function readCookie(cookieHeader: string | null, name: string): string | null {
    for (const part of (cookieHeader ?? '').split(';')) {
        const [key, ...value] = part.trim().split('=')
        if (key === name) {
            return decodeURIComponent(value.join('='))
        }
    }
    return null
}

/** The offered language that best matches an `Accept-Language` header, by quality and then order. */
export function matchAcceptLanguage(header: string | null, offered: ReadonlyArray<Locale> = OFFERED_LOCALES): Locale | null {
    const ranges = (header ?? '')
        .split(',')
        .map((entry, index) => {
            const [tag, ...params] = entry.trim().split(';')
            const q = params.map((param) => param.trim()).find((param) => param.startsWith('q='))
            const quality = q ? Number(q.slice(2)) : 1
            return {
                language: (tag ?? '').trim().toLowerCase().split('-')[0] ?? '',
                quality: Number.isFinite(quality) ? quality : 0,
                index,
            }
        })
        .filter((range) => range.language && range.quality > 0)
        .sort((a, b) => b.quality - a.quality || a.index - b.index)

    for (const range of ranges) {
        const match = offered.find((locale) => locale === range.language)
        if (match) {
            return match
        }
    }
    return null
}

/** The language for a visitor arriving at an address without a prefix: their choice, their browser, English. */
export function chooseLocale(
    cookieHeader: string | null,
    acceptLanguage: string | null,
    offered: ReadonlyArray<Locale> = OFFERED_LOCALES,
): Locale {
    const chosen = readCookie(cookieHeader, LOCALE_COOKIE)
    if (isSupportedLocale(chosen) && offered.includes(chosen)) {
        return chosen
    }
    return matchAcceptLanguage(acceptLanguage, offered) ?? SOURCE_LOCALE
}

/**
 * Where an address without a prefix goes: the same path and query under the visitor's language.
 * Returns null when the path already has a prefix or names a file, which are served as they are.
 */
export function localeRedirect(url: URL, cookieHeader: string | null, acceptLanguage: string | null): string | null {
    if (localeOfPath(url.pathname) || /\.[a-z0-9]+$/i.test(url.pathname)) {
        return null
    }
    const locale = chooseLocale(cookieHeader, acceptLanguage)
    const path = url.pathname === '/' ? '/' : url.pathname
    return `/${locale}${path}${url.search}`
}
