import { BadRequestException, HttpStatus } from '@nestjs/common'

import { ApiErrorFilter } from './api-error.filter'

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
})
