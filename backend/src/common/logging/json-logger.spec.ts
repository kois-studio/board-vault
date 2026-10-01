import { JsonLogger } from './json-logger'
import { requestContext } from './request-context'
import { structuredLog } from './structured-log'

describe('JsonLogger', () => {
    const lines: Array<Record<string, unknown>> = []
    let write: jest.SpyInstance

    beforeEach(() => {
        lines.length = 0
        write = jest.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
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
        expect(lines[0].message).toBe('http.request.completed')
    })

    it('adds the request id to every line inside a request', () => {
        const logger = new JsonLogger()

        requestContext.run({ requestId: 'req-1' }, () => logger.log('SELECT 1', 'DatabaseService'))
        logger.log('outside a request', 'Init')

        expect(lines[0]).toEqual(expect.objectContaining({ requestId: 'req-1', message: 'SELECT 1' }))
        expect(lines[1]).not.toHaveProperty('requestId')
    })
})
