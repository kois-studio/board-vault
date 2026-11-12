import { HttpErrorResponse } from '@angular/common/http'
import { LOCALE_ID } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { environment } from '../../../environments/environment'
import { ProblemErrorHandler } from '../errors/problem-error-handler'
import { PROBLEM_REPORTS_ENABLED, PROBLEMS_PER_VISIT, ProblemReportService } from './problem-report.service'
import { CurrentViewService } from './usage.service'

describe('ProblemReportService (#247, ADR-0028)', () => {
    let fetchSpy: ReturnType<typeof vi.fn>

    const setup = (enabled = true) => {
        fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
        vi.stubGlobal('fetch', fetchSpy)
        TestBed.configureTestingModule({
            providers: [
                { provide: PROBLEM_REPORTS_ENABLED, useValue: enabled },
                { provide: LOCALE_ID, useValue: 'es-ES' },
            ],
        })
        TestBed.inject(CurrentViewService).view.set('/groups/:groupId')
        return TestBed.inject(ProblemReportService)
    }
    const sent = () => fetchSpy.mock.calls.map(([, init]) => JSON.parse(String((init as RequestInit).body)))

    afterEach(() => vi.unstubAllGlobals())

    it('sends an error with its screen, build and language, without sign-in or credentials', () => {
        const problems = setup()

        problems.reportError(new TypeError('x is undefined'))

        expect(fetchSpy).toHaveBeenCalledWith(
            `${environment.apiUrl}/problems`,
            expect.objectContaining({
                method: 'POST',
                keepalive: true,
                credentials: 'omit',
                headers: { 'Content-Type': 'application/json' },
            }),
        )
        expect(sent()[0]).toMatchObject({
            kind: 'error',
            name: 'TypeError',
            message: 'x is undefined',
            view: '/groups/:groupId',
            locale: 'es',
        })
        expect(sent()[0].stack).toContain('TypeError')
        expect(sent()[0]).not.toHaveProperty('accountId')
    })

    it('tells a page whose code failed to load apart', () => {
        const problems = setup()

        problems.reportError(new TypeError('Failed to fetch dynamically imported module: https://board-vault.com/en/chunk-X.js'))

        expect(sent()[0].kind).toBe('chunk')
    })

    it('names a rejected object by its fields, never their values', () => {
        const problems = setup()

        problems.reportError({ email: 'ana@example.test', reason: 'secret' }, 'rejection')

        expect(sent()[0]).toMatchObject({ kind: 'rejection', name: 'Object', message: 'Object with email, reason' })
        expect(JSON.stringify(sent()[0])).not.toContain('ana@example.test')
    })

    it('sends the same problem once a visit, and at most a few a visit', () => {
        const problems = setup()
        const error = new Error('same')

        problems.reportError(error)
        problems.reportError(error)
        problems.reportError(new Error('same'))
        for (let index = 0; index < PROBLEMS_PER_VISIT * 2; index++) problems.reportError(new Error(`problem ${index}`))

        expect(fetchSpy).toHaveBeenCalledTimes(PROBLEMS_PER_VISIT)
    })

    it('reports a failed API call by its path and requestId, and ignores other sites', () => {
        const problems = setup()

        problems.reportRequest(
            { method: 'GET', url: `${environment.apiUrl}/dashboard/users/2/group-overviews?x=1`, status: 503, requestId: 'r-1' },
            '503 DATABASE_TIMEOUT',
        )
        problems.reportRequest({ method: 'GET', url: 'https://example.test/other', status: 500, requestId: null }, '500')

        expect(sent()).toEqual([
            expect.objectContaining({
                kind: 'request',
                method: 'GET',
                path: '/dashboard/users/2/group-overviews',
                status: 503,
                requestId: 'r-1',
                message: '503 DATABASE_TIMEOUT',
            }),
        ])
    })

    it('leaves an unhandled API error to the request report', () => {
        const problems = setup()

        problems.reportError(new HttpErrorResponse({ status: 500 }))

        expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('sends nothing while developing or in tests', () => {
        const problems = setup(false)

        problems.reportError(new Error('boom'))

        expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('never throws when the browser refuses to send', () => {
        const problems = setup()
        fetchSpy.mockImplementation(() => {
            throw new TypeError('blocked')
        })

        expect(() => problems.reportError(new Error('boom'))).not.toThrow()
    })
})

describe('ProblemErrorHandler', () => {
    it('reports what Angular hands it, a zone rejection as the rejected value', () => {
        const reportError = vi.fn()
        TestBed.configureTestingModule({ providers: [ProblemErrorHandler, { provide: ProblemReportService, useValue: { reportError } }] })
        const handler = TestBed.inject(ProblemErrorHandler)
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const rejected = new Error('inner')
        const zoneError = Object.assign(new Error('Uncaught (in promise): Error: inner'), { rejection: rejected })
        const thrown = new Error('thrown')

        handler.handleError(zoneError)
        handler.handleError(thrown)

        expect(reportError).toHaveBeenNthCalledWith(1, rejected, 'rejection')
        expect(reportError).toHaveBeenNthCalledWith(2, thrown)
    })
})
