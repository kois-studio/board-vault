import { lastValueFrom, of } from 'rxjs'

import { isView } from '../../../common/types/usage.type.js'

import { routeTemplate, UsageInterceptor } from './usage.interceptor.js'

import type { UsageService } from './usage.service.js'
import type { CallHandler, ExecutionContext } from '@nestjs/common'

function contextFor(request: object): ExecutionContext {
    return { getType: () => 'http', switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext
}

describe('UsageInterceptor', () => {
    const record = vi.fn()
    const interceptor = new UsageInterceptor({ record } as unknown as UsageService)
    const run = (request: object, response: unknown = {}) =>
        lastValueFrom(interceptor.intercept(contextFor(request), { handle: () => of(response) } as CallHandler))

    beforeEach(() => record.mockReset())

    it('names a night status change by the status it moved to', async () => {
        await run({
            method: 'PATCH',
            route: { path: '/sessions/:sessionId/status' },
            headers: {},
            body: { status: 'completed' },
            user: { userId: 4 },
        })

        expect(record).toHaveBeenCalledWith(4, 'session_finished', null)
    })

    it('keeps the screen header only when it is a route template', async () => {
        const request = (view: string) => ({
            method: 'POST',
            route: { path: '/collection/users/:userId/reviews/:gameId' },
            headers: { 'x-board-vault-view': view },
            user: { userId: 4 },
        })

        await run(request('/games/:gameId'))
        await run(request('/games/42'))

        expect(record.mock.calls).toEqual([
            [4, 'review_saved', '/games/:gameId'],
            [4, 'review_saved', null],
        ])
    })

    it('records nothing for unlisted routes, anonymous requests, or a wishlist removal', async () => {
        await run({ method: 'GET', route: { path: '/play/users/:userId/meets' }, headers: {}, user: { userId: 4 } })
        await run({ method: 'POST', route: { path: '/collection/users/:userId/games/:gameId' }, headers: {} })
        await run(
            { method: 'PUT', route: { path: '/collection/users/:userId/games/:gameId/wishlist' }, headers: {}, user: { userId: 4 } },
            { isWishlisted: false },
        )

        expect(record).not.toHaveBeenCalled()
    })

    it('normalises the route Express kept', () => {
        expect(routeTemplate('//sessions/:sessionId/')).toBe('/sessions/:sessionId')
        expect(routeTemplate(undefined)).toBe('/')
    })
})

describe('screen templates', () => {
    it('accepts route templates and refuses anything with an id, a name or a query', () => {
        expect(['/', '/play', '/groups/:groupId', '/groups/:groupId/people/:personId/claim', '/admin/manage-games'].every(isView)).toBe(
            true,
        )
        expect(['/groups/12', '/u/bea@example.test', '/play?tab=1', 'play', '/Play', `/${'a'.repeat(90)}`].some(isView)).toBe(false)
    })
})
