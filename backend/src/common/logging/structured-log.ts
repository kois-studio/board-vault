/**
 * Serialize allow-listed operational fields as one-line JSON.
 * Callers must pass identifiers that are safe for operations; this helper does
 * not make arbitrary request or provider payloads safe by itself.
 */
export function structuredLog(event: string, fields: Record<string, unknown> = {}): string {
    return JSON.stringify({ event, ...fields })
}

export function safeErrorName(error: unknown): string {
    return error instanceof Error ? error.name : 'unknown'
}
