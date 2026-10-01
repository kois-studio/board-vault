import { BadRequestException, HttpStatus } from '@nestjs/common'

import { API_ERROR_CODES, BoardVaultHttpException } from './api-error'
import { ApiErrorFilter } from './api-error.filter'
import { ProviderTimeoutError } from './provider-timeout'

function createHost(exception: unknown) {
    const response = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    }
    const request = { method: 'POST', originalUrl: '/sessions' }
    const host = {
        switchToHttp: () => ({
            getRequest: () => request,
            getResponse: () => response,
        }),
    }

    return { exception, host, response }
}

describe('ApiErrorFilter', () => {
    it('normalizes validation errors while retaining safe field details', () => {
        const filter = new ApiErrorFilter()
        const { host, response } = createHost(new BadRequestException({ message: ['groupId must be an integer'], error: 'Bad Request' }))

        filter.catch(new BadRequestException({ message: ['groupId must be an integer'], error: 'Bad Request' }), host as never)

        expect(response.setHeader).toHaveBeenCalledWith('X-Request-Id', expect.any(String))
        expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
        expect(response.json).toHaveBeenCalledWith({
            statusCode: 400,
            code: 'BAD_REQUEST',
            message: 'Request validation failed',
            details: ['groupId must be an integer'],
            requestId: expect.any(String),
        })
    })

    it('hides unexpected exception details behind a generic response', () => {
        const filter = new ApiErrorFilter()
        const { host, response } = createHost(new Error('TURSO_AUTH_TOKEN=secret'))

        filter.catch(new Error('TURSO_AUTH_TOKEN=secret'), host as never)

        expect(response.status).toHaveBeenCalledWith(500)
        expect(response.json).toHaveBeenCalledWith({
            statusCode: 500,
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Request failed',
            requestId: expect.any(String),
        })
        expect(JSON.stringify(response.json.mock.calls[0][0])).not.toContain('TURSO_AUTH_TOKEN')
    })

    it('preserves a stable allow-listed domain code', () => {
        const filter = new ApiErrorFilter()
        const { host, response } = createHost(
            new BoardVaultHttpException(API_ERROR_CODES.PRIVATE_BETA_REGISTRATION_CLOSED, HttpStatus.FORBIDDEN, 'Registration is closed'),
        )

        filter.catch(
            new BoardVaultHttpException(API_ERROR_CODES.PRIVATE_BETA_REGISTRATION_CLOSED, HttpStatus.FORBIDDEN, 'Registration is closed'),
            host as never,
        )

        expect(response.json).toHaveBeenCalledWith({
            statusCode: 403,
            code: 'PRIVATE_BETA_REGISTRATION_CLOSED',
            message: 'Registration is closed',
            requestId: expect.any(String),
        })
    })

    it('keeps provider failures safe and diagnosable', () => {
        const filter = new ApiErrorFilter()
        const { host, response } = createHost(
            new BoardVaultHttpException(
                API_ERROR_CODES.CLERK_PROVIDER_UNAVAILABLE,
                HttpStatus.BAD_GATEWAY,
                'The invitation provider is temporarily unavailable',
            ),
        )

        filter.catch(
            new BoardVaultHttpException(
                API_ERROR_CODES.CLERK_PROVIDER_UNAVAILABLE,
                HttpStatus.BAD_GATEWAY,
                'The invitation provider is temporarily unavailable',
            ),
            host as never,
        )

        expect(response.json).toHaveBeenCalledWith({
            statusCode: 502,
            code: 'CLERK_PROVIDER_UNAVAILABLE',
            message: 'The invitation provider is temporarily unavailable',
            requestId: expect.any(String),
        })
    })

    it.each([
        ['database', 'DATABASE_TIMEOUT'],
        ['clerk', 'CLERK_TIMEOUT'],
    ] as const)('answers a %s timeout with 503 and a stable code', (provider, code) => {
        const filter = new ApiErrorFilter()
        const { host, response } = createHost(new ProviderTimeoutError(provider))

        filter.catch(new ProviderTimeoutError(provider), host as never)

        expect(response.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE)
        expect(response.json).toHaveBeenCalledWith({
            statusCode: 503,
            code,
            message: expect.any(String),
            requestId: expect.any(String),
        })
    })
})
