import { ConsoleLogger, type LogLevel } from '@nestjs/common'

import { requestContext } from './request-context'

/**
 * One JSON object per line, for Vercel's log search. Messages written with
 * `structuredLog` are merged in as fields instead of nested as a string, and
 * every line inside a request carries its `requestId`.
 */
export class JsonLogger extends ConsoleLogger {
    constructor() {
        super({ json: true })
    }

    protected getJsonLogObject(
        message: unknown,
        options: { context: string; logLevel: LogLevel; writeStreamType?: 'stdout' | 'stderr'; errorStack?: unknown },
    ) {
        const requestId = requestContext.getStore()?.requestId
        const structured = parseStructured(message)

        return {
            ...super.getJsonLogObject(structured ? structured.event : message, options),
            ...(requestId ? { requestId } : {}),
            ...structured,
        }
    }
}

function parseStructured(message: unknown): Record<string, unknown> | undefined {
    if (typeof message !== 'string' || !message.startsWith('{"event":')) {
        return undefined
    }

    try {
        return JSON.parse(message) as Record<string, unknown>
    } catch {
        return undefined
    }
}
