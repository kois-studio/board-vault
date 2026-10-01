import { requestContext } from '../logging/request-context'

import { LoggerMiddleware } from './logger.middleware'

describe('LoggerMiddleware', () => {
    it('correlates responses and never logs query-string tokens', () => {
        const middleware = new LoggerMiddleware()
        const logger = jest.spyOn((middleware as unknown as { LOGGER: { log: (message: string) => void } }).LOGGER, 'log')
        const finishHandlers: Array<() => void> = []
        const response = {
            statusCode: 200,
            setHeader: jest.fn(),
            once: jest.fn((_event: string, handler: () => void) => finishHandlers.push(handler)),
        }
        const request = {
            method: 'GET',
            path: '/auth/clerk/status',
            originalUrl: '/auth/clerk/status?token=secret-token',
            headers: { authorization: 'Bearer secret-token' },
        }

        middleware.use(request as never, response as never, jest.fn())
        finishHandlers[0]()

        expect(response.setHeader).toHaveBeenCalledWith('X-Request-Id', expect.any(String))
        expect(logger).toHaveBeenCalledTimes(2)
        expect(logger.mock.calls.join(' ')).not.toContain('secret-token')
        expect(logger.mock.calls[0][0]).toContain('http.request.started')
        expect(logger.mock.calls[1][0]).toContain('http.request.completed')
        expect(logger.mock.calls.join(' ')).toContain('/auth/clerk/status')
    })

    it('adds the route template and account, and scopes the request id', () => {
        const middleware = new LoggerMiddleware()
        const logger = jest.spyOn((middleware as unknown as { LOGGER: { log: (message: string) => void } }).LOGGER, 'log')
        const finishHandlers: Array<() => void> = []
        const response = {
            statusCode: 403,
            setHeader: jest.fn(),
            once: jest.fn((_event: string, handler: () => void) => finishHandlers.push(handler)),
        }
        const request: Record<string, unknown> = { method: 'GET', originalUrl: '/groups/12', url: '/groups/12', headers: {} }
        let requestIdInside: string | undefined

        middleware.use(request as never, response as never, () => {
            requestIdInside = requestContext.getStore()?.requestId
            // Set later in the pipeline by Express routing and ClerkSessionMiddleware.
            request.route = { path: '/groups/:groupId' }
            request.user = { userId: 7 }
        })
        finishHandlers[0]()

        const completed = JSON.parse(logger.mock.calls[1][0])

        expect(requestIdInside).toBe(request.requestId)
        expect(completed).toEqual(
            expect.objectContaining({ route: '/groups/:groupId', statusCode: 403, accountId: 7, requestId: request.requestId }),
        )
    })
})
