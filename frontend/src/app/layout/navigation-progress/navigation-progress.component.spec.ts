import { Component } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { NAVIGATION_PROGRESS_DELAY_MS, NavigationProgressComponent } from './navigation-progress.component'

@Component({ template: 'A page' })
class PageComponent {}

describe('NavigationProgressComponent (#264)', () => {
    /** `slow` resolves when the spec says, as a page whose code is still loading. */
    let finishSlowPage: () => void
    /** `broken` fails when the spec says, as a chunk that does not arrive. */
    let breakPage: () => void

    const setup = async (firstUrl = '/') => {
        vi.useFakeTimers()
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: '', component: PageComponent },
                    { path: 'quick', component: PageComponent },
                    {
                        path: 'slow',
                        loadComponent: () => new Promise((resolve) => (finishSlowPage = () => resolve(PageComponent))),
                    },
                    {
                        path: 'broken',
                        loadComponent: () => new Promise((_, reject) => (breakPage = () => reject(new Error('chunk failed')))),
                    },
                ]),
            ],
        })
        const fixture = TestBed.createComponent(NavigationProgressComponent)
        const router = TestBed.inject(Router)
        const bar = () => (fixture.nativeElement as HTMLElement).querySelector('[data-testid="navigation-progress"]')
        const waitFor = async (ms: number) => {
            await vi.advanceTimersByTimeAsync(ms)
            fixture.detectChanges()
        }
        // The first page has the boot frame instead.
        const first = router.navigateByUrl(firstUrl)
        await waitFor(NAVIGATION_PROGRESS_DELAY_MS + 50)
        expect(bar()).toBeNull()
        if (firstUrl === '/slow') finishSlowPage()
        await first
        return { router, bar, waitFor }
    }

    afterEach(() => vi.useRealTimers())

    it('stays hidden for a page that opens in a moment', async () => {
        const { router, bar, waitFor } = await setup()

        void router.navigateByUrl('/quick')
        await waitFor(NAVIGATION_PROGRESS_DELAY_MS + 50)

        expect(bar()).toBeNull()
    })

    it('shows while a page takes longer than a moment, and goes once it opens', async () => {
        const { router, bar, waitFor } = await setup()

        const opening = router.navigateByUrl('/slow')
        await waitFor(NAVIGATION_PROGRESS_DELAY_MS - 50)
        expect(bar()).toBeNull()
        await waitFor(100)
        expect(bar()?.getAttribute('role')).toBe('progressbar')
        expect(bar()?.getAttribute('aria-label')).toBe('Opening the page')

        finishSlowPage()
        await opening
        await waitFor(0)
        expect(bar()).toBeNull()
    })

    it('stays hidden while the first page takes its time: the boot frame shows instead', async () => {
        const { bar, waitFor } = await setup('/slow')

        await waitFor(0)
        expect(bar()).toBeNull()
    })

    it('goes when the page’s code fails to load', async () => {
        const { router, bar, waitFor } = await setup()

        const opening = router.navigateByUrl('/broken').catch(() => false)
        await waitFor(NAVIGATION_PROGRESS_DELAY_MS + 50)
        expect(bar()).not.toBeNull()

        breakPage()
        await opening
        await waitFor(0)
        expect(bar()).toBeNull()
    })

    it('goes when the navigation is replaced by another', async () => {
        const { router, bar, waitFor } = await setup()

        void router.navigateByUrl('/slow')
        await waitFor(NAVIGATION_PROGRESS_DELAY_MS + 50)
        expect(bar()).not.toBeNull()

        await router.navigateByUrl('/quick')
        await waitFor(NAVIGATION_PROGRESS_DELAY_MS + 50)
        expect(bar()).toBeNull()
    })
})
