import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import type { Mock } from 'vitest'
import { LoginService } from '../../core/services/login.service'
import { AuthHandoffComponent } from './auth-handoff.component'

describe('AuthHandoffComponent', () => {
    let fixture: ComponentFixture<AuthHandoffComponent>
    let state: ReturnType<typeof signal<'idle' | 'linking' | 'ready' | 'error' | 'unavailable'>>
    let error: ReturnType<typeof signal<string | null>>
    let retry: Mock
    let signOut: Mock
    let reconnecting: ReturnType<typeof signal<boolean>>

    beforeEach(() => {
        state = signal<'idle' | 'linking' | 'ready' | 'error' | 'unavailable'>('linking')
        error = signal<string | null>(null)
        retry = vi.fn().mockName('retry')
        signOut = vi.fn().mockName('signOut').mockResolvedValue(undefined)
        reconnecting = signal(false)

        TestBed.configureTestingModule({
            imports: [AuthHandoffComponent],
            providers: [
                provideRouter([]),
                {
                    provide: LoginService,
                    useValue: {
                        clerkAuthHandoffState: state,
                        clerkAuthHandoffError: error,
                        retryClerkSession: retry,
                        signOutClerk: signOut,
                        isReconnecting: reconnecting,
                    },
                },
            ],
        })

        fixture = TestBed.createComponent(AuthHandoffComponent)
        fixture.detectChanges()
    })

    it('gives a visible and announced loading handoff without exposing navigation', () => {
        const section = fixture.nativeElement.querySelector('section') as HTMLElement

        expect(fixture.nativeElement.textContent).toContain('Connecting you to your Board Vault')
        expect(fixture.nativeElement.textContent).toContain('loading your groups')
        expect(section.getAttribute('aria-busy')).toBe('true')
        expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull()
        expect(fixture.nativeElement.querySelectorAll('button').length).toBe(0)
    })

    it('is the skip link’s target, sized below the header unless the layout has none', () => {
        const main = fixture.nativeElement.querySelector('main') as HTMLElement

        expect(main.id).toBe('main-content')
        expect(main.getAttribute('tabindex')).toBe('-1')
        expect(main.classList).toContain('min-h-[calc(100vh-9rem)]')
        expect(main.classList).toContain('flex')

        fixture.componentRef.setInput('fillsViewport', true)
        fixture.detectChanges()

        expect(main.classList).toContain('min-h-dvh')
        expect(main.classList).not.toContain('min-h-[calc(100vh-9rem)]')
        expect(main.classList).toContain('flex')
    })

    it('offers explicit retry and sign-out recovery when linking fails', () => {
        error.set('The local account could not be loaded.')
        state.set('error')
        fixture.detectChanges()

        const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
        expect(fixture.nativeElement.textContent).toContain('We could not finish setting up your sign-in')
        expect(fixture.nativeElement.querySelector('section').getAttribute('aria-busy')).toBe('false')
        expect(buttons.length).toBe(2)

        buttons[0]?.click()
        buttons[1]?.click()

        expect(retry).toHaveBeenCalled()
        expect(signOut).toHaveBeenCalled()
    })

    it('says Board Vault cannot be reached, without blaming the sign-in, and keeps a way to try now', () => {
        state.set('unavailable')
        fixture.detectChanges()

        const element = fixture.nativeElement as HTMLElement
        const [tryAgain, signOutButton] = Array.from(element.querySelectorAll('button'))
        expect(element.querySelector('h1')?.textContent).toContain('We can’t reach Board Vault right now')
        expect(element.querySelector('[role="alert"]')?.textContent).toContain('Your sign-in is fine')
        expect(element.textContent).not.toContain('setting up your sign-in')
        expect(element.textContent).not.toContain('invitation link')
        expect(element.querySelector('section')?.getAttribute('aria-busy')).toBe('false')

        // Try again is the main action; signing out is still there, but not as a button of the same weight.
        expect(tryAgain?.textContent).toContain('Try again')
        expect(tryAgain?.classList).toContain('app-btn-primary')
        expect(signOutButton?.textContent).toContain('Sign out')
        expect(signOutButton?.hasAttribute('appButton')).toBe(false)
        tryAgain?.click()
        expect(retry).toHaveBeenCalled()

        reconnecting.set(true)
        fixture.detectChanges()
        expect(tryAgain?.getAttribute('aria-busy')).toBe('true')
        expect(tryAgain?.hasAttribute('disabled')).toBe(true)
        expect(element.querySelector('section')?.getAttribute('aria-busy')).toBe('true')

        // The try failed: the button is usable again and has keyboard focus back.
        reconnecting.set(false)
        fixture.detectChanges()
        TestBed.tick()
        expect(tryAgain?.hasAttribute('disabled')).toBe(false)
        expect(document.activeElement).toBe(tryAgain)
    })
})
