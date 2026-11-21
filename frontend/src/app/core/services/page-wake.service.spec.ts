import { TestBed } from '@angular/core/testing'
import { PageWakeService, WAKE_GRACE_MS } from './page-wake.service'

describe('PageWakeService (#355)', () => {
    let visibility: DocumentVisibilityState

    beforeEach(() => {
        vi.useFakeTimers()
        visibility = 'visible'
        vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
    })
    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    const wakeUp = (event: string) => {
        visibility = 'visible'
        document.dispatchEvent(new Event(event))
    }

    it('has not just woken when nothing happened', () => {
        expect(TestBed.inject(PageWakeService).justWoke()).toBe(false)
    })

    it.each(['visibilitychange', 'pageshow', 'online'])('counts %s as waking, for a few seconds', (event) => {
        const wake = TestBed.inject(PageWakeService)

        if (event === 'visibilitychange') wakeUp(event)
        else window.dispatchEvent(new Event(event))

        expect(wake.justWoke()).toBe(true)
        vi.advanceTimersByTime(WAKE_GRACE_MS)
        expect(wake.justWoke()).toBe(false)
    })

    it('knows of the wake before a listener on the document reacts to it', () => {
        const wake = TestBed.inject(PageWakeService)
        let wokeWhenTheDocumentHeard: boolean | undefined
        document.addEventListener('visibilitychange', () => (wokeWhenTheDocumentHeard = wake.justWoke()), { once: true })

        wakeUp('visibilitychange')

        expect(wokeWhenTheDocumentHeard).toBe(true)
    })

    it('does not count going out of view as waking', () => {
        const wake = TestBed.inject(PageWakeService)
        visibility = 'hidden'

        document.dispatchEvent(new Event('visibilitychange'))

        expect(wake.justWoke()).toBe(false)
        expect(wake.isHidden()).toBe(true)
    })

    it('says when the page can be seen again', () => {
        const wake = TestBed.inject(PageWakeService)
        visibility = 'hidden'
        let seen = false
        wake.visible().subscribe(() => (seen = true))

        expect(seen).toBe(false)
        wakeUp('visibilitychange')
        expect(seen).toBe(true)
    })
})
