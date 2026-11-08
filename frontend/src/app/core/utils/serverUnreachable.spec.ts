import { HttpErrorResponse } from '@angular/common/http'
import { TimeoutError } from 'rxjs'
import { isServerUnreachable } from './serverUnreachable'

describe('isServerUnreachable', () => {
    const http = (status: number) => new HttpErrorResponse({ status })

    afterEach(() => vi.unstubAllGlobals())

    it('counts no answer, a timeout, and a server error as unreachable', () => {
        expect(isServerUnreachable(http(0))).toBe(true)
        expect(isServerUnreachable(http(500))).toBe(true)
        expect(isServerUnreachable(http(502))).toBe(true)
        expect(isServerUnreachable(http(503))).toBe(true)
        expect(isServerUnreachable(http(504))).toBe(true)
        expect(isServerUnreachable(new TimeoutError())).toBe(true)
    })

    it('leaves answers about the request or the session to their own handling', () => {
        for (const status of [400, 401, 403, 404, 409, 422]) {
            expect(isServerUnreachable(http(status))).toBe(false)
        }
    })

    it('counts any other failure only while the browser is offline', () => {
        const failure = new Error('Failed to fetch')
        vi.stubGlobal('navigator', { onLine: true })
        expect(isServerUnreachable(failure)).toBe(false)

        vi.stubGlobal('navigator', { onLine: false })
        expect(isServerUnreachable(failure)).toBe(true)
    })
})
