import { Logger } from '@nestjs/common'

import { JsonLogger } from './json-logger.js'
import { requestContext } from './request-context.js'
import { structuredLog } from './structured-log.js'

import type { MockInstance } from 'vitest'

describe('JsonLogger', () => {
    const lines: Array<Record<string, unknown>> = []
    let write: MockInstance

    beforeEach(() => {
        lines.length = 0
        write = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
            lines.push(JSON.parse(String(chunk)) as Record<string, unknown>)
            return true
        })
    })

    afterEach(() => write.mockRestore())

    it('writes one flat JSON object per structured line', () => {
        new JsonLogger().log(structuredLog('http.request.completed', { statusCode: 200 }), 'LoggerMiddleware')

        expect(lines).toEqual([
            expect.objectContaining({ level: 'log', context: 'LoggerMiddleware', event: 'http.request.completed', statusCode: 200 }),
        ])
        expect(lines[0]?.message).toBe('http.request.completed')
    })

    it('adds the request id to every line inside a request', () => {
        const logger = new JsonLogger()

        requestContext.run({ requestId: 'req-1' }, () => logger.log('SELECT 1', 'DatabaseService'))
        logger.log('outside a request', 'Init')

        expect(lines[0]).toEqual(expect.objectContaining({ requestId: 'req-1', message: 'SELECT 1' }))
        expect(lines[1]).not.toHaveProperty('requestId')
    })

    it('leaves verbose and debug lines out, and keeps everything else (#254)', () => {
        const logger = new JsonLogger()
        const errors = vi.spyOn(process.stderr, 'write').mockImplementation((chunk: string | Uint8Array) => {
            lines.push(JSON.parse(String(chunk)) as Record<string, unknown>)
            return true
        })

        try {
            logger.verbose('SELECT * FROM Account', 'DatabaseService')
            logger.debug('[FEATURE] IN getHome', 'HomeService')
            logger.log('kept log', 'Init')
            logger.warn('kept warn', 'Init')
            logger.error('kept error', undefined, 'Init')
            logger.fatal('kept fatal', 'Init')
        } finally {
            errors.mockRestore()
        }

        expect(lines.map(line => line.message)).toEqual(['kept log', 'kept warn', 'kept error', 'kept fatal'])
    })

    it('leaves the SQL out of the Vercel logs, through the Logger every service uses (#254)', () => {
        Logger.overrideLogger(new JsonLogger())

        try {
            new Logger('DatabaseService').verbose('SELECT 1')
            new Logger('LoggerMiddleware').log(structuredLog('http.request.completed', { statusCode: 200 }))
        } finally {
            Logger.overrideLogger(true)
        }

        expect(lines).toEqual([expect.objectContaining({ event: 'http.request.completed', context: 'LoggerMiddleware' })])
    })
})
