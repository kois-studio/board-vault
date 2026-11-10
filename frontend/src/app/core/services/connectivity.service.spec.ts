import { TestBed } from '@angular/core/testing'
import { CHECK_GIVES_UP_MS, ConnectivityService } from './connectivity.service'

describe('ConnectivityService (#241)', () => {
    const setup = () => {
        const service = TestBed.inject(ConnectivityService)
        const refreshes = vi.fn()
        service.refreshes.subscribe(refreshes)
        return { service, refreshes }
    }

    afterEach(() => vi.restoreAllMocks())

    it('starts reachable when the browser is online', () => {
        const { service } = setup()

        expect(service.isDegraded()).toBe(false)
        expect(service.isChecking()).toBe(false)
    })

    it('starts degraded when the browser is already offline', () => {
        vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

        expect(TestBed.inject(ConnectivityService).isDegraded()).toBe(true)
    })

    it('is degraded after a request Board Vault could not answer, and recovers on its next answer', () => {
        const { service, refreshes } = setup()

        service.reportUnreachable()
        expect(service.isDegraded()).toBe(true)
        expect(refreshes).not.toHaveBeenCalled()

        service.reportAnswered()
        expect(service.isDegraded()).toBe(false)
        // What failed meanwhile loads again.
        expect(refreshes).toHaveBeenCalledTimes(1)
    })

    it('asks for no reload on answers while all is well', () => {
        const { service, refreshes } = setup()

        service.reportAnswered()
        service.reportAnswered()

        expect(refreshes).not.toHaveBeenCalled()
    })

    it('is degraded at once when the browser goes offline', () => {
        const { service } = setup()

        window.dispatchEvent(new Event('offline'))

        expect(service.isDegraded()).toBe(true)
    })

    it('reloads when the browser comes back online, and stays degraded until Board Vault answers', () => {
        const { service, refreshes } = setup()
        service.reportUnreachable()
        window.dispatchEvent(new Event('offline'))

        window.dispatchEvent(new Event('online'))

        expect(refreshes).toHaveBeenCalledTimes(1)
        expect(service.isDegraded()).toBe(true)
        service.reportAnswered()
        expect(service.isDegraded()).toBe(false)
    })

    it('clears being offline when the browser comes back, even with no request in between', () => {
        const { service } = setup()
        window.dispatchEvent(new Event('offline'))

        window.dispatchEvent(new Event('online'))

        expect(service.isDegraded()).toBe(false)
    })

    it('trusts an answer over the browser saying it is offline, so the banner cannot stay up for good', () => {
        const { service, refreshes } = setup()
        window.dispatchEvent(new Event('offline'))
        expect(service.isDegraded()).toBe(true)

        service.reportAnswered()

        expect(service.isDegraded()).toBe(false)
        expect(refreshes).toHaveBeenCalledTimes(1)
    })

    it('reloads on Try again and shows it is checking until the next request ends', () => {
        const { service, refreshes } = setup()
        service.reportUnreachable()

        service.retry()
        expect(refreshes).toHaveBeenCalledTimes(1)
        expect(service.isChecking()).toBe(true)

        service.reportUnreachable()
        expect(service.isChecking()).toBe(false)
        expect(service.isDegraded()).toBe(true)
    })

    it('ends a check on an outcome that says nothing about Board Vault, and keeps the notice as it was', () => {
        const { service } = setup()
        service.reportUnreachable()
        service.retry()

        service.reportInconclusive()

        expect(service.isChecking()).toBe(false)
        expect(service.isDegraded()).toBe(true)
    })

    it('stops showing a check as busy when it never hears back', () => {
        vi.useFakeTimers()
        try {
            const { service } = setup()
            service.retry()

            vi.advanceTimersByTime(CHECK_GIVES_UP_MS - 1)
            expect(service.isChecking()).toBe(true)
            vi.advanceTimersByTime(1)
            expect(service.isChecking()).toBe(false)
        } finally {
            vi.useRealTimers()
        }
    })

    it('reloads once for Try again, not again when the answer it brought arrives', () => {
        const { service, refreshes } = setup()
        service.reportUnreachable()

        service.retry()
        service.reportAnswered()

        expect(refreshes).toHaveBeenCalledTimes(1)
        expect(service.isDegraded()).toBe(false)
    })

    it('reloads once when the browser comes back online and Board Vault answers', () => {
        const { service, refreshes } = setup()
        service.reportUnreachable()
        window.dispatchEvent(new Event('offline'))

        window.dispatchEvent(new Event('online'))
        service.reportAnswered()

        expect(refreshes).toHaveBeenCalledTimes(1)
    })

    it('reloads again on recovery when the reload it asked for failed first', () => {
        const { service, refreshes } = setup()
        service.reportUnreachable()
        service.retry()
        service.reportUnreachable()

        service.reportAnswered()

        expect(refreshes).toHaveBeenCalledTimes(2)
    })

    it('stops listening to the browser when destroyed', () => {
        const { service } = setup()
        TestBed.resetTestingModule()

        window.dispatchEvent(new Event('offline'))

        expect(service.isDegraded()).toBe(false)
    })
})
