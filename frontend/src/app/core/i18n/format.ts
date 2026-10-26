import { isSupportedLocale, type Locale, SOURCE_LOCALE } from './locales'

/**
 * Dates, times, and numbers in the page's language (ADR-0024). Each language's build sets
 * `$localize.locale`; development and unit tests run in English. No component names a locale
 * for display: they format through these helpers or Angular's pipes.
 */
export function pageLocale(): Locale {
    const locale = typeof $localize === 'undefined' ? undefined : $localize.locale
    return isSupportedLocale(locale) ? locale : SOURCE_LOCALE
}

/** The regional variant whose conventions we show: day before month, 24-hour clock, Monday first. */
const INTL_LOCALES: Record<Locale, string> = { en: 'en-GB', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT' }

export function intlLocale(locale: Locale = pageLocale()): string {
    return INTL_LOCALES[locale]
}

const dateFormats = new Map<string, Intl.DateTimeFormat>()

/** Formats a date in the page's language; a time zone the browser does not know falls back to the device's. */
export function formatDateTime(date: Date | number, options: Intl.DateTimeFormatOptions, timeZone?: string): string {
    const key = JSON.stringify([options, timeZone ?? null])
    let format = dateFormats.get(key)
    if (!format) {
        try {
            format = new Intl.DateTimeFormat(intlLocale(), { ...options, ...(timeZone ? { timeZone } : {}) })
        } catch {
            format = new Intl.DateTimeFormat(intlLocale(), options)
        }
        dateFormats.set(key, format)
    }
    return format.format(date)
}

/**
 * `YYYY-MM-DD` of a date in a time zone: a data format for day keys and `<input type="date">`,
 * never shown as text. `en-CA` is the locale whose short date has that shape.
 */
export function isoDay(date: Date | number, timeZone?: string): string {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' }
    try {
        return new Intl.DateTimeFormat('en-CA', { ...options, ...(timeZone ? { timeZone } : {}) }).format(date)
    } catch {
        return new Intl.DateTimeFormat('en-CA', options).format(date)
    }
}

const relativeFormat = () => new Intl.RelativeTimeFormat(intlLocale(), { numeric: 'auto' })

/** The first letter in upper case, for a phrase that starts a line ("yesterday" → "Yesterday"). */
export function capitalize(text: string): string {
    return text.charAt(0).toLocaleUpperCase(intlLocale()) + text.slice(1)
}

/** "Today", "Tomorrow", "In 5 days", "Yesterday", "3 weeks ago" for a day `days` from today. */
export function relativeDays(days: number): string {
    const distance = Math.abs(days)
    const [value, unit]: [number, Intl.RelativeTimeFormatUnit] =
        distance < 14 ? [days, 'day'] : distance < 60 ? [Math.round(days / 7), 'week'] : [Math.round(days / 30), 'month']
    return capitalize(relativeFormat().format(value, unit))
}

/** "Just now", "5 minutes ago", "Yesterday", "3 weeks ago" for a moment in the past. */
export function timeAgo(date: Date | number, now = Date.now()): string {
    const seconds = Math.max(0, Math.floor((now - new Date(date).getTime()) / 1000))
    if (seconds < 60) return $localize`:A moment ago, on a notification or a history line:Just now`

    const steps: Array<[number, number, Intl.RelativeTimeFormatUnit]> = [
        [3600, 60, 'minute'],
        [86400, 3600, 'hour'],
        [604800, 86400, 'day'],
        [2592000, 604800, 'week'],
        [31536000, 2592000, 'month'],
    ]
    const [, divisor, unit] = steps.find(([limit]) => seconds < limit) ?? [0, 31536000, 'year']
    return capitalize(relativeFormat().format(-Math.floor(seconds / divisor), unit))
}

/** "Ana", "Ana and Bo", "Ana, Bo and Cy": a complete list joined in the page's language. */
export function formatList(items: Array<string>): string {
    return new Intl.ListFormat(intlLocale(), { style: 'long', type: 'conjunction' }).format(items)
}

/** A number in the page's language ("1,234" / "1.234"). */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(intlLocale(), options).format(value)
}
