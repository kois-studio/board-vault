import {
    HttpClient,
    HttpContext,
    HttpErrorResponse,
    HttpEventType,
    HttpInterceptorFn,
    provideHttpClient,
    withInterceptors,
} from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { Observable, switchMap, throwError, timer } from 'rxjs'
import { ConnectivityService } from '../services/connectivity.service'
import { ApiUnavailableError, isSaveOutcomeUnknown } from '../utils/apiUnavailable'
import { isServerUnreachable } from '../utils/serverUnreachable'
import {
    asReadOnly,
    READ_RETRY_DELAY_MS,
    READ_TIMEOUT_MS,
    REQUEST_TIMEOUT_MS,
    resilienceInterceptor,
    WRITE_TIMEOUT_MS,
    withoutReadRetry,
} from './resilience.interceptor'

describe('resilienceInterceptor (#240)', () => {
    let http: HttpClient
    let backend: HttpTestingController

    const setup = (inner: Array<HttpInterceptorFn> = []) => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withInterceptors([resilienceInterceptor, ...inner])), provideHttpClientTesting()],
        })
        http = TestBed.inject(HttpClient)
        backend = TestBed.inject(HttpTestingController)
    }

    /** Subscribes and records what came out. */
    const send = <T>(request: ReturnType<HttpClient['get']>) => {
        const result: { value?: T; error?: unknown; done: boolean } = { done: false }
        request.subscribe({
            next: (value) => {
                result.value = value as T
            },
            error: (error: unknown) => {
                result.error = error
                result.done = true
            },
            complete: () => {
                result.done = true
            },
        })
        return result
    }
    const fail = (url: string, status: number, body: Parameters<TestRequest['flush']>[0] = null) =>
        backend.expectOne(url).flush(body, { status, statusText: status === 0 ? 'Unknown Error' : 'Error' })
    const noAnswer = (url: string) => backend.expectOne(url).error(new ProgressEvent('error'), { status: 0 })

    beforeEach(() => vi.useFakeTimers())
    afterEach(() => {
        backend.verify()
        vi.useRealTimers()
    })

    describe('reads', () => {
        it('tries a 503 once more after a second, and answers with the second try', () => {
            setup()
            const result = send(http.get('/api/groups'))

            fail('/api/groups', 503, { code: 'DATABASE_TIMEOUT' })
            vi.advanceTimersByTime(READ_RETRY_DELAY_MS - 1)
            backend.expectNone('/api/groups')
            vi.advanceTimersByTime(1)
            backend.expectOne('/api/groups').flush([{ id: 1 }])

            expect(result.value).toEqual([{ id: 1 }])
            expect(result.error).toBeUndefined()
        })

        it('surfaces a second 503 as a server error, with the API’s answer kept', () => {
            setup()
            const result = send(http.get('/api/groups'))

            fail('/api/groups', 503, { code: 'DATABASE_TIMEOUT' })
            vi.advanceTimersByTime(READ_RETRY_DELAY_MS)
            fail('/api/groups', 503, { code: 'DATABASE_TIMEOUT' })

            const error = result.error as ApiUnavailableError
            expect(error).toBeInstanceOf(ApiUnavailableError)
            expect(error).toBeInstanceOf(HttpErrorResponse)
            expect(error.kind).toBe('server')
            expect(error.status).toBe(503)
            expect(error.error).toEqual({ code: 'DATABASE_TIMEOUT' })
            expect(error.outcomeUnknown).toBe(false)
            expect(isServerUnreachable(error)).toBe(true)
            vi.advanceTimersByTime(60_000)
        })

        it.each([0, 502, 504])('tries once more after a %i', (status) => {
            setup()
            const result = send(http.get('/api/groups'))

            if (status === 0) noAnswer('/api/groups')
            else fail('/api/groups', status)
            vi.advanceTimersByTime(READ_RETRY_DELAY_MS)
            backend.expectOne('/api/groups').flush([])

            expect(result.value).toEqual([])
        })

        it('reports no answer at all as a network error', () => {
            setup()
            const result = send(http.get('/api/groups'))

            noAnswer('/api/groups')
            vi.advanceTimersByTime(READ_RETRY_DELAY_MS)
            noAnswer('/api/groups')

            expect((result.error as ApiUnavailableError).kind).toBe('network')
            expect((result.error as ApiUnavailableError).status).toBe(0)
        })

        it('gives up on a hung read after 12 s, cancels it, tries once more, and then fails as a timeout', () => {
            setup()
            const result = send(http.get('/api/groups'))

            const first = backend.expectOne('/api/groups')
            vi.advanceTimersByTime(READ_TIMEOUT_MS - 1)
            expect(result.done).toBe(false)
            vi.advanceTimersByTime(1)
            expect(first.cancelled).toBe(true)
            expect(result.done).toBe(false)

            vi.advanceTimersByTime(READ_RETRY_DELAY_MS)
            const second = backend.expectOne('/api/groups')
            vi.advanceTimersByTime(READ_TIMEOUT_MS)

            expect(second.cancelled).toBe(true)
            const error = result.error as ApiUnavailableError
            expect(error.kind).toBe('timeout')
            expect(error.status).toBe(0)
            expect(error.url).toBe('/api/groups')
            expect(error.outcomeUnknown).toBe(false)
            expect(isServerUnreachable(error)).toBe(true)
        })

        it.each([400, 401, 403, 404, 409, 422])('never tries a %i again, and passes it through untouched', (status) => {
            setup()
            const result = send(http.get('/api/groups/9'))

            fail('/api/groups/9', status, { code: 'X' })
            vi.advanceTimersByTime(60_000)

            expect(result.error).toBeInstanceOf(HttpErrorResponse)
            expect(result.error).not.toBeInstanceOf(ApiUnavailableError)
            expect((result.error as HttpErrorResponse).status).toBe(status)
        })

        it('does not try a 500 again (a bug, not a blip), but reports it as Board Vault failing', () => {
            setup()
            const result = send(http.get('/api/groups'))

            fail('/api/groups', 500)
            vi.advanceTimersByTime(60_000)

            expect((result.error as ApiUnavailableError).kind).toBe('server')
            expect((result.error as ApiUnavailableError).status).toBe(500)
        })

        it('treats HEAD as a read', () => {
            setup()
            const result = send(http.head('/api/health'))

            fail('/api/health', 503)
            vi.advanceTimersByTime(READ_RETRY_DELAY_MS)
            backend.expectOne('/api/health').flush(null)

            expect(result.error).toBeUndefined()
        })

        it('leaves the retry to callers that retry by themselves', () => {
            setup()
            const result = send(http.get('/api/inbox', { context: withoutReadRetry() }))

            fail('/api/inbox', 503)
            vi.advanceTimersByTime(60_000)

            expect((result.error as ApiUnavailableError).kind).toBe('server')
        })

        it('takes a time limit from the request', () => {
            setup()
            const result = send(http.get('/api/slow', { context: new HttpContext().set(REQUEST_TIMEOUT_MS, 3_000) }))

            backend.expectOne('/api/slow')
            vi.advanceTimersByTime(3_000)
            expect(result.done).toBe(false)
            vi.advanceTimersByTime(READ_RETRY_DELAY_MS)
            backend.expectOne('/api/slow')
            vi.advanceTimersByTime(3_000)

            expect((result.error as ApiUnavailableError).kind).toBe('timeout')
        })

        it('counts the wait for the sign-in token in the time limit', () => {
            // The token comes from an interceptor after this one; 8 s for it plus 5 s for the answer is over 12 s.
            const slowToken: HttpInterceptorFn = (req, next) => timer(8_000).pipe(switchMap(() => next(req)))
            setup([slowToken])
            const result = send(http.get('/api/groups', { context: withoutReadRetry() }))

            vi.advanceTimersByTime(8_000)
            const request = backend.expectOne('/api/groups')
            vi.advanceTimersByTime(4_000)

            expect(request.cancelled).toBe(true)
            expect((result.error as ApiUnavailableError).kind).toBe('timeout')
        })

        it('does not restart the clock when the request leaves the browser', () => {
            // HttpTestingController never emits Sent, so a backend stand-in does: Sent at 8 s, then nothing.
            const sentLate: HttpInterceptorFn = () =>
                new Observable((subscriber) => {
                    const id = setTimeout(() => subscriber.next({ type: HttpEventType.Sent }), 8_000)
                    return () => clearTimeout(id)
                })
            setup([sentLate])
            const result = send(http.get('/api/groups', { context: withoutReadRetry() }))

            vi.advanceTimersByTime(READ_TIMEOUT_MS - 1)
            expect(result.done).toBe(false)
            vi.advanceTimersByTime(1)

            expect((result.error as ApiUnavailableError).kind).toBe('timeout')
        })

        it('treats a POST marked read-only as a read: 12 s, one retry, never an unknown outcome', () => {
            setup()
            const result = send(http.post('/api/recommendations', { groupId: 1 }, { context: asReadOnly() }))

            fail('/api/recommendations', 503)
            vi.advanceTimersByTime(READ_RETRY_DELAY_MS)
            backend.expectOne('/api/recommendations')
            vi.advanceTimersByTime(READ_TIMEOUT_MS)

            const error = result.error as ApiUnavailableError
            expect(error.kind).toBe('timeout')
            expect(error.outcomeUnknown).toBe(false)
        })

        it('leaves no timer behind when the caller stops waiting', () => {
            setup()
            const subscription = http.get('/api/groups').subscribe()
            const request = backend.expectOne('/api/groups')

            subscription.unsubscribe()

            expect(request.cancelled).toBe(true)
            expect(vi.getTimerCount()).toBe(0)
        })
    })

    describe('writes', () => {
        it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('sends a %s once, even when Board Vault answers 503', (method) => {
            setup()
            const result = send(http.request(method, '/api/groups/1', { body: { name: 'x' } }))

            fail('/api/groups/1', 503)
            vi.advanceTimersByTime(60_000)
            backend.expectNone('/api/groups/1')

            const error = result.error as ApiUnavailableError
            expect(error.kind).toBe('server')
            // The API answered that it is unavailable: nothing was saved.
            expect(error.outcomeUnknown).toBe(false)
        })

        it('gives up on a hung write after 20 s, once, and says its outcome is unknown', () => {
            setup()
            const result = send(http.post('/api/sessions/live', { gameId: 1 }))

            const request = backend.expectOne('/api/sessions/live')
            request.event({ type: HttpEventType.Sent }) // as the browser does once the request is on its way
            vi.advanceTimersByTime(READ_TIMEOUT_MS)
            expect(result.done).toBe(false)
            vi.advanceTimersByTime(WRITE_TIMEOUT_MS - READ_TIMEOUT_MS)

            expect(request.cancelled).toBe(true)
            const error = result.error as ApiUnavailableError
            expect(error.kind).toBe('timeout')
            expect(error.outcomeUnknown).toBe(true)
            expect(isSaveOutcomeUnknown(error)).toBe(true)
            vi.advanceTimersByTime(60_000)
            backend.expectNone('/api/sessions/live')
        })

        it('says the outcome is known when a write timed out before it left the browser', () => {
            // Still waiting for the sign-in token after 20 s: nothing reached Board Vault.
            const tokenNeverCame: HttpInterceptorFn = () => new Observable(() => undefined)
            setup([tokenNeverCame])
            const result = send(http.post('/api/sessions/live', { gameId: 1 }))

            vi.advanceTimersByTime(WRITE_TIMEOUT_MS)

            const error = result.error as ApiUnavailableError
            expect(error.kind).toBe('timeout')
            expect(error.outcomeUnknown).toBe(false)
        })

        it('says the outcome is unknown when a write timed out after it left the browser', () => {
            const sentThenSilent: HttpInterceptorFn = () => new Observable((subscriber) => subscriber.next({ type: HttpEventType.Sent }))
            setup([sentThenSilent])
            const result = send(http.post('/api/sessions/live', { gameId: 1 }))

            vi.advanceTimersByTime(WRITE_TIMEOUT_MS)

            expect(isSaveOutcomeUnknown(result.error)).toBe(true)
        })

        it('says the outcome of a write is unknown when the answer was lost, or a gateway gave up', () => {
            setup()
            const lost = send(http.post('/api/groups', {}))
            noAnswer('/api/groups')
            const gateway = send(http.post('/api/groups', {}))
            fail('/api/groups', 504)
            const refused = send(http.post('/api/groups', {}))
            fail('/api/groups', 409, { code: 'CONFLICT' })

            expect(isSaveOutcomeUnknown(lost.error)).toBe(true)
            expect(isSaveOutcomeUnknown(gateway.error)).toBe(true)
            expect(isSaveOutcomeUnknown(refused.error)).toBe(false)
            expect(refused.error).not.toBeInstanceOf(ApiUnavailableError)
        })

        it('says the outcome of a write is unknown when the database timed out, which may be after it committed (#246)', () => {
            setup()
            const timedOut = send(http.post('/api/sessions', {}))
            fail('/api/sessions', 503, { status: 503, code: 'DATABASE_TIMEOUT', message: 'The database did not answer in time.' })
            const unavailable = send(http.post('/api/sessions', {}))
            fail('/api/sessions', 503, { status: 503, code: 'DATABASE_UNAVAILABLE' })
            const read = send(http.get('/api/sessions', { context: withoutReadRetry() }))
            fail('/api/sessions', 503, { status: 503, code: 'DATABASE_TIMEOUT' })

            vi.advanceTimersByTime(60_000)
            backend.expectNone('/api/sessions')
            expect((timedOut.error as ApiUnavailableError).kind).toBe('server')
            expect(isSaveOutcomeUnknown(timedOut.error)).toBe(true)
            expect(isSaveOutcomeUnknown(unavailable.error)).toBe(false)
            expect(isSaveOutcomeUnknown(read.error)).toBe(false)
        })

        it('keeps an upload alive while it makes progress, and gives up once it stalls', () => {
            setup()
            const result = send(http.post('/api/upload', new Blob(['x']), { reportProgress: true, observe: 'events' }) as never)
            const request = backend.expectOne('/api/upload')

            for (let i = 0; i < 3; i++) {
                vi.advanceTimersByTime(WRITE_TIMEOUT_MS - 1)
                request.event({ type: HttpEventType.UploadProgress, loaded: i, total: 3 })
            }
            expect(result.done).toBe(false)
            vi.advanceTimersByTime(WRITE_TIMEOUT_MS)

            expect((result.error as ApiUnavailableError).kind).toBe('timeout')
        })
    })

    it('passes errors that are not HTTP answers through untouched', () => {
        const tokenFailed = new Error('Clerk could not fetch a token')
        const brokenToken: HttpInterceptorFn = () => {
            throw tokenFailed
        }
        setup([brokenToken])
        const result = send(http.get('/api/groups'))
        vi.advanceTimersByTime(60_000)

        expect(result.error).toBe(tokenFailed)
    })

    describe('telling whether Board Vault can be reached (#241)', () => {
        const connectivity = () => TestBed.inject(ConnectivityService)

        it('reports a read only after its retry failed too, before the caller hears of it', () => {
            setup()
            let degradedWhenTheCallerHeard: boolean | undefined
            http.get('/api/groups').subscribe({ error: () => (degradedWhenTheCallerHeard = connectivity().isDegraded()) })

            fail('/api/groups', 503)
            // A blip the retry may still fix shows nothing.
            expect(connectivity().isDegraded()).toBe(false)
            vi.advanceTimersByTime(READ_RETRY_DELAY_MS)
            fail('/api/groups', 503)

            expect(degradedWhenTheCallerHeard).toBe(true)
        })

        it('reports nothing for a blip the retry fixed', () => {
            setup()
            send(http.get('/api/groups'))

            noAnswer('/api/groups')
            vi.advanceTimersByTime(READ_RETRY_DELAY_MS)
            backend.expectOne('/api/groups').flush([])

            expect(connectivity().isDegraded()).toBe(false)
        })

        it.each([
            ['no answer', (url: string) => noAnswer(url)],
            ['a 502', (url: string) => fail(url, 502)],
            ['a 504', (url: string) => fail(url, 504)],
        ])('reports a write that got %s', (_name, failure) => {
            setup()
            send(http.post('/api/groups', {}))

            failure('/api/groups')

            expect(connectivity().isDegraded()).toBe(true)
        })

        it('reports a request that timed out', () => {
            setup()
            send(http.get('/api/groups', { context: withoutReadRetry() }))
            backend.expectOne('/api/groups')

            vi.advanceTimersByTime(READ_TIMEOUT_MS)

            expect(connectivity().isDegraded()).toBe(true)
        })

        it.each([
            ['an answer', (url: string) => backend.expectOne(url).flush([])],
            ['a 404', (url: string) => fail(url, 404)],
            ['a 401', (url: string) => fail(url, 401)],
        ])('counts %s as Board Vault being back', (_name, answer) => {
            setup()
            connectivity().reportUnreachable()
            send(http.get('/api/groups'))

            answer('/api/groups')

            expect(connectivity().isDegraded()).toBe(false)
        })

        it('neither raises nor clears the notice for a 500, a bug in one place', () => {
            setup()
            send(http.get('/api/a'))
            fail('/api/a', 500)
            expect(connectivity().isDegraded()).toBe(false)

            connectivity().reportUnreachable()
            send(http.get('/api/b'))
            fail('/api/b', 500)
            expect(connectivity().isDegraded()).toBe(true)
        })

        it.each([
            ['a 500', () => fail('/api/groups', 500)],
            ['a missing sign-in token', () => undefined],
        ])('ends a Try again in progress on %s, so its button works again', (name, outcome) => {
            // Like authInterceptor, which waits for the token: its failure arrives as an error, after the request started.
            const brokenToken: HttpInterceptorFn = () => throwError(() => new Error('Clerk could not fetch a token'))
            setup(name === 'a 500' ? [] : [brokenToken])
            connectivity().reportUnreachable()
            connectivity().retry()
            send(http.get('/api/groups'))

            outcome()
            vi.advanceTimersByTime(1)

            expect(connectivity().isChecking()).toBe(false)
            expect(connectivity().isDegraded()).toBe(true)
        })

        it('says nothing about Board Vault when the request failed before leaving (no sign-in token)', () => {
            const brokenToken: HttpInterceptorFn = () => {
                throw new Error('Clerk could not fetch a token')
            }
            setup([brokenToken])
            send(http.get('/api/groups'))
            vi.advanceTimersByTime(60_000)

            expect(connectivity().isDegraded()).toBe(false)
        })

        it('reports nothing for a request the caller stopped waiting for', () => {
            setup()
            const subscription = http.get('/api/groups').subscribe()
            backend.expectOne('/api/groups')

            subscription.unsubscribe()
            vi.advanceTimersByTime(60_000)

            expect(connectivity().isDegraded()).toBe(false)
        })
    })
})
