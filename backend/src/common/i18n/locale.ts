/**
 * The interface languages (ADR-0024), kept in step with `frontend/src/app/core/i18n/locales.ts`.
 * The frontend sends its build's language as `Accept-Language`; any other client gets the best
 * supported match for whatever it sends, or English.
 */
export const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'it'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'

export function isSupportedLocale(value: unknown): value is Locale {
    return typeof value === 'string' && (SUPPORTED_LOCALES as ReadonlyArray<string>).includes(value)
}

/** The supported language that best matches an `Accept-Language` header, by quality and then order. */
export function localeFromAcceptLanguage(header: string | undefined | null): Locale {
    const ranges = (header ?? '')
        .split(',')
        .map((entry, index) => {
            const [tag = '', ...params] = entry.trim().split(';')
            const q = params.map(param => param.trim()).find(param => param.startsWith('q='))
            const quality = q ? Number(q.slice(2)) : 1

            return { language: tag.trim().toLowerCase().split('-')[0] ?? '', quality: Number.isFinite(quality) ? quality : 0, index }
        })
        .filter(range => range.language && range.quality > 0)
        .sort((a, b) => b.quality - a.quality || a.index - b.index)

    return ranges.map(range => range.language).find(isSupportedLocale) ?? DEFAULT_LOCALE
}
