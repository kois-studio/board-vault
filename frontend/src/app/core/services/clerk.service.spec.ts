import { TestBed } from '@angular/core/testing'
import { NavigationEnd, NavigationStart, Router } from '@angular/router'
import { Subject } from 'rxjs'

import { afterFirstPagePaint, ClerkService } from './clerk.service'

describe('ClerkService loading', () => {
    it('starts loading only when the first page has painted', async () => {
        const service = TestBed.inject(ClerkService)
        const load = vi.spyOn(service as unknown as { load: () => Promise<void> }, 'load').mockResolvedValue()
        let painted!: () => void

        service.initialize(new Promise<void>((resolve) => (painted = resolve)))
        expect(load).not.toHaveBeenCalled()

        painted()
        await Promise.resolve()
        expect(load).toHaveBeenCalledTimes(1)
    })

    it('starts at once when something needs the session first, and loads only once', async () => {
        const service = TestBed.inject(ClerkService)
        const load = vi.spyOn(service as unknown as { load: () => Promise<void> }, 'load').mockResolvedValue()
        let painted!: () => void
        service.initialize(new Promise<void>((resolve) => (painted = resolve)))

        await service.whenLoaded()
        painted()
        await Promise.resolve()
        await service.getToken()

        expect(load).toHaveBeenCalledTimes(1)
    })
})

describe('afterFirstPagePaint', () => {
    it('waits for the first navigation to finish, then for a painted frame', async () => {
        vi.useFakeTimers()
        const events = new Subject<unknown>()
        let done = false
        void afterFirstPagePaint({ events } as unknown as Router).then(() => (done = true))

        events.next(new NavigationStart(1, '/'))
        await vi.runAllTimersAsync()
        expect(done).toBe(false)

        events.next(new NavigationEnd(1, '/', '/'))
        await vi.runAllTimersAsync()
        expect(done).toBe(true)
        vi.useRealTimers()
    })
})
