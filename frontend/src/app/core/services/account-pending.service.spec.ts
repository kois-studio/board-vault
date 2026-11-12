import { Component, computed, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { type ActivatedRouteSnapshot, provideRouter, Router } from '@angular/router'
import { AccountPendingService, FOCUSED_LAYOUT, HANDOFF_CARD_AFTER_MS } from './account-pending.service'
import type { ClerkAuthHandoffState } from './login.service'
import { LoginService } from './login.service'

@Component({ template: 'page' })
class PageComponent {}

describe('AccountPendingService (#259)', () => {
    const isSignedIn = signal(false)
    const isAuthenticated = signal(false)
    const clerkAuthHandoffState = signal<ClerkAuthHandoffState>('idle')
    let service: AccountPendingService

    const snapshot = (focused: boolean) =>
        ({ pathFromRoot: [{ data: {} }, { data: focused ? { [FOCUSED_LAYOUT]: true } : {} }] }) as unknown as ActivatedRouteSnapshot

    beforeEach(() => {
        isSignedIn.set(false)
        isAuthenticated.set(false)
        clerkAuthHandoffState.set('idle')
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: 'page', component: PageComponent },
                    { path: 'held', component: PageComponent, canActivate: [() => new Promise<boolean>(() => {})] },
                    { path: 'refused', component: PageComponent, canActivate: [() => false] },
                ]),
                {
                    provide: LoginService,
                    useValue: {
                        isAuthenticated,
                        clerkAuthHandoffState,
                        isClerkAuthHandoffActive: computed(() => isSignedIn() && !isAuthenticated()),
                    },
                },
            ],
        })
        service = TestBed.inject(AccountPendingService)
    })

    afterEach(() => vi.useRealTimers())

    describe('while the account is confirmed', () => {
        it('shows the skeleton first, and "Connecting you…" only once it takes a while', () => {
            vi.useFakeTimers()
            isSignedIn.set(true)
            clerkAuthHandoffState.set('linking')
            TestBed.tick()

            expect(service.isPending()).toBe(true)
            expect(service.showsAppFrame()).toBe(true)
            expect(service.showsHandoffCard()).toBe(false)

            vi.advanceTimersByTime(HANDOFF_CARD_AFTER_MS - 1)
            expect(service.showsHandoffCard()).toBe(false)
            vi.advanceTimersByTime(1)
            expect(service.showsHandoffCard()).toBe(true)
        })

        it.each(['error', 'unavailable'] as const)('shows the card at once when it ends in %s', (state) => {
            isSignedIn.set(true)
            clerkAuthHandoffState.set(state)
            TestBed.tick()

            expect(service.showsHandoffCard()).toBe(true)
        })

        it('keeps the card on Try again, instead of going back to the skeleton', () => {
            isSignedIn.set(true)
            clerkAuthHandoffState.set('unavailable')
            TestBed.tick()

            clerkAuthHandoffState.set('linking')
            TestBed.tick()

            expect(service.showsHandoffCard()).toBe(true)
        })

        it('waits the whole time again for the next sign-in', () => {
            vi.useFakeTimers()
            isSignedIn.set(true)
            TestBed.tick()
            vi.advanceTimersByTime(HANDOFF_CARD_AFTER_MS)
            expect(service.showsHandoffCard()).toBe(true)

            isAuthenticated.set(true)
            TestBed.tick()
            expect(service.isPending()).toBe(false)
            expect(service.showsHandoffCard()).toBe(false)

            isAuthenticated.set(false)
            TestBed.tick()
            expect(service.showsHandoffCard()).toBe(false)
            vi.advanceTimersByTime(HANDOFF_CARD_AFTER_MS)
            expect(service.showsHandoffCard()).toBe(true)
        })

        it('is nothing for someone signed out, or once the account is known', () => {
            TestBed.tick()
            expect(service.isPending()).toBe(false)
            expect(service.showsAppFrame()).toBe(false)

            isSignedIn.set(true)
            isAuthenticated.set(true)
            TestBed.tick()
            expect(service.isPending()).toBe(false)
            expect(service.showsAppFrame()).toBe(true)
        })
    })

    describe('the first page', () => {
        it('shows the app frame, or a focused page’s, while it waits in its guard', () => {
            service.showBootFrameWhileWaiting(snapshot(false))
            expect(service.bootFrame()).toBe('app')
            expect(service.isPending()).toBe(true)
            // Nothing is known about sign-in yet, so it never says anything about it.
            expect(service.showsHandoffCard()).toBe(false)

            service.showBootFrameWhileWaiting(snapshot(true))
            expect(service.bootFrame()).toBe('focused')
        })

        it('lets the frame go when that navigation ends', async () => {
            service.showBootFrameWhileWaiting(snapshot(false))

            await TestBed.inject(Router).navigateByUrl('/page')

            expect(service.bootFrame()).toBeNull()
        })

        it('stays while a navigation that replaced the first one is on its way, as a section link in the frame does', async () => {
            const router = TestBed.inject(Router)
            service.showBootFrameWhileWaiting(snapshot(false))
            void router.navigateByUrl('/held')
            await Promise.resolve()

            void router.navigateByUrl('/held?again=1')
            await Promise.resolve()

            expect(service.bootFrame()).toBe('app')
        })

        it('lets the frame go when the first page is refused and nothing replaces it', async () => {
            service.showBootFrameWhileWaiting(snapshot(false))

            expect(await TestBed.inject(Router).navigateByUrl('/refused')).toBe(false)

            expect(service.bootFrame()).toBeNull()
        })

        it('is the only one: later pages open inside a layout already on screen', async () => {
            await TestBed.inject(Router).navigateByUrl('/page')

            service.showBootFrameWhileWaiting(snapshot(false))

            expect(service.bootFrame()).toBeNull()
        })
    })
})
