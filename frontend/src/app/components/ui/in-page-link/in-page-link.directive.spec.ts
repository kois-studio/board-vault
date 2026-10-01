import { Location } from '@angular/common'
import { provideLocationMocks } from '@angular/common/testing'
import { Component } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'
import { InPageLinkDirective } from './in-page-link.directive'

@Component({
    imports: [InPageLinkDirective],
    template: `
        <a appInPageLink="sessions">Sessions</a>
        <a appInPageLink="missing">Missing</a>
        <section id="sessions"><h2>Sessions</h2></section>
    `,
})
class GroupPageComponent {}

describe('InPageLinkDirective', () => {
    let harness: RouterTestingHarness
    let location: Location
    let scrollIntoView: ReturnType<typeof vi.fn>
    // jsdom does not implement scrollIntoView; stub it per test and restore it afterwards.
    const originalScrollIntoView = Element.prototype.scrollIntoView

    const root = () => harness.routeNativeElement as HTMLElement
    const link = (name: string) => [...root().querySelectorAll('a')].find((anchor) => anchor.textContent === name) as HTMLAnchorElement
    const click = (anchor: HTMLAnchorElement, init: MouseEventInit = {}) => {
        const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init })
        anchor.dispatchEvent(event)
        return event
    }

    beforeEach(async () => {
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: 'groups/:groupId', component: GroupPageComponent },
                    { path: 'play', component: GroupPageComponent },
                ]),
                provideLocationMocks(),
            ],
        })
        scrollIntoView = vi.fn()
        Element.prototype.scrollIntoView = scrollIntoView as unknown as Element['scrollIntoView']
        harness = await RouterTestingHarness.create('/groups/7?tab=all')
        location = TestBed.inject(Location)
    })

    afterEach(() => {
        Element.prototype.scrollIntoView = originalScrollIntoView
    })

    it('points at the current route instead of the site root', () => {
        expect(link('Sessions').getAttribute('href')).toBe('/groups/7?tab=all#sessions')
    })

    it('follows navigation to another route', async () => {
        await harness.navigateByUrl('/play')

        expect(link('Sessions').getAttribute('href')).toBe('/play#sessions')
    })

    it('scrolls to and focuses the target without leaving the page', () => {
        const event = click(link('Sessions'))
        const target = root().querySelector('#sessions') as HTMLElement

        expect(event.defaultPrevented).toBe(true)
        expect(scrollIntoView).toHaveBeenCalledOnce()
        expect(target.getAttribute('tabindex')).toBe('-1')
        expect(document.activeElement).toBe(target)
        expect(location.path(true)).toBe('/groups/7?tab=all#sessions')
    })

    it('scrolls again when the same link is clicked twice', () => {
        click(link('Sessions'))
        click(link('Sessions'))

        expect(scrollIntoView).toHaveBeenCalledTimes(2)
    })

    it('leaves modified clicks to the browser so the link can open in a new tab', () => {
        const event = click(link('Sessions'), { ctrlKey: true })

        expect(event.defaultPrevented).toBe(false)
        expect(scrollIntoView).not.toHaveBeenCalled()
    })

    it('does nothing special when the target is not on the page', () => {
        const event = click(link('Missing'))

        expect(event.defaultPrevented).toBe(false)
        expect(scrollIntoView).not.toHaveBeenCalled()
        expect(location.path(true)).toBe('/groups/7?tab=all')
    })
})
