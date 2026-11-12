import { Component, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { loadingState, type ResourceState, readyState } from '../../../core/async/resource-state'
import { ASYNC, SKELETON_DELAY_MS, SKELETON_MIN_MS, SLOW_AFTER_MS } from './async.component'

@Component({
    imports: [ASYNC],
    template: `
        <app-async [state]="state()" loadingLabel="Loading your games" errorMessage="Your games could not be loaded." (retry)="retries = retries + 1">
            <ng-template appAsyncLoading><div data-test="skeleton"></div></ng-template>
            <ng-template appAsyncEmpty><p data-test="empty">No games yet</p></ng-template>
            <ng-template [appAsyncReady]="state()" let-games>
                <ul data-test="ready">
                    @for (game of games; track game) {
                        <li>{{ game }}</li>
                    }
                </ul>
            </ng-template>
        </app-async>
    `,
})
class HostComponent {
    readonly state = signal<ResourceState<string[]>>(loadingState())
    retries = 0
}

describe('AsyncComponent (#256)', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    function render() {
        const fixture = TestBed.createComponent(HostComponent)
        fixture.detectChanges()
        const element = fixture.nativeElement as HTMLElement
        const host = () => element.querySelector('app-async') as HTMLElement
        const has = (selector: string) => element.querySelector(selector) !== null
        const advance = (ms: number) => {
            vi.advanceTimersByTime(ms)
            fixture.detectChanges()
        }
        const setState = (state: ResourceState<string[]>) => {
            fixture.componentInstance.state.set(state)
            fixture.detectChanges()
        }
        return { fixture, element, host, has, advance, setState }
    }

    it('shows nothing for a quick answer: no skeleton flashes', () => {
        const view = render()

        expect(view.has('[data-test="skeleton"]')).toBe(false)
        expect(view.has('[data-test="empty"]')).toBe(false)
        view.advance(SKELETON_DELAY_MS - 50)
        view.setState(readyState(['Azul']))

        expect(view.has('[data-test="skeleton"]')).toBe(false)
        expect(view.element.querySelector('[data-test="ready"]')?.textContent).toContain('Azul')
    })

    it('never shows the empty state while loading, only once it has loaded empty', () => {
        const view = render()
        view.advance(SKELETON_DELAY_MS)

        expect(view.has('[data-test="skeleton"]')).toBe(true)
        expect(view.has('[data-test="empty"]')).toBe(false)
        expect(view.host().getAttribute('aria-busy')).toBe('true')
        expect(view.element.querySelector('[role="status"]')?.textContent).toContain('Loading your games')

        view.setState(readyState([]))
        view.advance(SKELETON_MIN_MS)
        expect(view.has('[data-test="empty"]')).toBe(true)
        expect(view.host().getAttribute('aria-busy')).toBeNull()
    })

    it('keeps a skeleton it has shown for at least 300 ms', () => {
        const view = render()
        view.advance(SKELETON_DELAY_MS)

        view.setState(readyState(['Azul']))
        expect(view.has('[data-test="skeleton"]')).toBe(true)
        view.advance(SKELETON_MIN_MS - 1)
        expect(view.has('[data-test="skeleton"]')).toBe(true)
        view.advance(1)
        expect(view.has('[data-test="skeleton"]')).toBe(false)
        expect(view.has('[data-test="ready"]')).toBe(true)
    })

    it('says a slow load is slow after 8 s, and Retry asks to load again', () => {
        const view = render()
        view.advance(SLOW_AFTER_MS - 1)
        expect(view.has('[data-async="slow"]')).toBe(false)

        view.advance(1)
        expect(view.element.querySelector('[data-async="slow"]')?.textContent).toContain('This is taking longer than usual')
        view.element.querySelector<HTMLButtonElement>('[data-async="slow"] button')?.click()
        view.fixture.detectChanges()

        expect(view.fixture.componentInstance.retries).toBe(1)
        expect(view.has('[data-async="slow"]')).toBe(false)
        view.advance(SLOW_AFTER_MS)
        expect(view.has('[data-async="slow"]')).toBe(true)
    })

    it('shows the failure with Retry, never the empty state, when the first load fails', () => {
        const view = render()
        view.setState({ status: 'error', value: undefined, error: new Error('offline') })

        const alert = view.element.querySelector('[data-async="error"]')
        expect(alert?.getAttribute('role')).toBe('alert')
        expect(alert?.textContent).toContain('Your games could not be loaded.')
        expect(view.has('[data-test="empty"]')).toBe(false)
        alert?.querySelector('button')?.click()
        expect(view.fixture.componentInstance.retries).toBe(1)
    })

    it('treats a failed reload of an empty list as a failure, not as empty', () => {
        const view = render()
        view.setState({ status: 'error', value: [], error: new Error('offline') })

        expect(view.has('[data-async="error"]')).toBe(true)
        expect(view.has('[data-test="empty"]')).toBe(false)
    })

    it('keeps what is shown while it refreshes, with a small hint and no skeleton', () => {
        const view = render()
        view.setState(readyState(['Azul']))
        const list = view.element.querySelector('[data-test="ready"]')

        view.setState({ status: 'refreshing', value: ['Azul'] })
        view.advance(SLOW_AFTER_MS)
        expect(view.element.querySelector('[data-test="ready"]')).toBe(list)
        expect(view.has('[data-test="skeleton"]')).toBe(false)
        expect(view.has('[data-async="refreshing"]')).toBe(true)
        expect(view.host().getAttribute('aria-busy')).toBe('true')
    })

    it('keeps what loaded before when a reload fails, and offers Retry', () => {
        const view = render()
        view.setState(readyState(['Azul']))
        view.setState({ status: 'error', value: ['Azul'], error: new Error('offline') })

        expect(view.element.querySelector('[data-test="ready"]')?.textContent).toContain('Azul')
        expect(view.has('[data-async="error"]')).toBe(false)
        view.element.querySelector<HTMLButtonElement>('[data-async="stale"] button')?.click()
        expect(view.fixture.componentInstance.retries).toBe(1)
    })

    it('waits again before a skeleton when loading starts over (sign-out and back in)', () => {
        const view = render()
        view.setState(readyState(['Azul']))
        view.setState(loadingState())

        expect(view.has('[data-test="skeleton"]')).toBe(false)
        expect(view.has('[data-test="ready"]')).toBe(false)
        view.advance(SKELETON_DELAY_MS)
        expect(view.has('[data-test="skeleton"]')).toBe(true)
    })

    it('keeps the skeleton when loading starts again while it is held, never a blank section', () => {
        const view = render()
        view.advance(SKELETON_DELAY_MS)
        view.setState(readyState(['Azul']))
        view.advance(100)

        view.setState(loadingState())
        view.advance(SKELETON_MIN_MS)
        expect(view.has('[data-test="skeleton"]')).toBe(true)
        view.advance(SLOW_AFTER_MS)
        expect(view.has('[data-async="slow"]')).toBe(true)

        view.setState(readyState(['Azul']))
        view.advance(SKELETON_MIN_MS)
        expect(view.has('[data-test="ready"]')).toBe(true)
    })
})

@Component({
    imports: [ASYNC],
    template: `
        <app-async holdSpace [state]="state()">
            <ng-template appAsyncLoading><div data-test="skeleton"></div></ng-template>
            <ng-template appAsyncReady><p data-test="ready">Azul</p></ng-template>
        </app-async>
    `,
})
class HoldingHostComponent {
    readonly state = signal<ResourceState<string[]>>(loadingState())
}

describe('AsyncComponent holdSpace (#260)', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('holds the skeleton’s place, unseen, before it shows, and lets the content take it', () => {
        const fixture = TestBed.createComponent(HoldingHostComponent)
        fixture.detectChanges()
        const element = fixture.nativeElement as HTMLElement
        const holding = () => element.querySelector('[data-async="holding"]')

        expect(holding()?.classList.contains('invisible')).toBe(true)
        expect(holding()?.getAttribute('aria-hidden')).toBe('true')
        expect(holding()?.querySelector('[data-test="skeleton"]')).not.toBeNull()
        expect(element.querySelector('[role="status"]')).toBeNull()

        vi.advanceTimersByTime(SKELETON_DELAY_MS)
        fixture.detectChanges()
        expect(holding()).toBeNull()
        expect(element.querySelector('[role="status"] [data-test="skeleton"]')).not.toBeNull()

        fixture.componentInstance.state.set(readyState(['Azul']))
        vi.advanceTimersByTime(SKELETON_MIN_MS)
        fixture.detectChanges()
        expect(element.querySelector('[data-test="skeleton"]')).toBeNull()
        expect(element.querySelector('[data-test="ready"]')).not.toBeNull()
    })
})
