/** `2026-10-08 18:00:00`, `2026-10-08T18:00`, or a date alone: SQLite text dates with no zone. */
const ZONELESS_DATE_TIME = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)?$/

/**
 * ## Stored date to milliseconds
 * Session dates are stored as text in several shapes: `…Z` from the app, `…+02:00` from seed
 * scripts, and `2026-10-08 18:00:00` from SQLite's `CURRENT_TIMESTAMP`. A zoneless value is UTC,
 * as SQLite writes it; `Date.parse` would read it in the server's time zone instead.
 * @returns milliseconds since the epoch, or NaN when the text is not a date
 */
export function parseStoredDate(value: string): number {
    const trimmed = value.trim()

    if (ZONELESS_DATE_TIME.test(trimmed)) {
        const [date, time = '00:00'] = trimmed.split(/[ T]/)

        return Date.parse(`${date}T${time}Z`)
    }

    return Date.parse(trimmed)
}

/**
 * ## Stored date to ISO
 * The same instant as `parseStoredDate`, written the one way the API answers with:
 * `2026-10-08T18:00:00.000Z`. Text that is not a date is returned unchanged.
 */
export function toIsoDate(value: string): string {
    const time = parseStoredDate(value)

    return Number.isNaN(time) ? value : new Date(time).toISOString()
}
