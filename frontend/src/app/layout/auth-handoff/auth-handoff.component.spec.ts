import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { ClerkService } from '../../core/services/clerk.service'
import { LoginService } from '../../core/services/login.service'
import { AuthHandoffComponent } from './auth-handoff.component'

describe('AuthHandoffComponent', () => {
    let fixture: ComponentFixture<AuthHandoffComponent>
    let state: ReturnType<typeof signal<'idle' | 'linking' | 'ready' | 'error'>>
    let error: ReturnType<typeof signal<string | null>>
    let retry: jasmine.Spy
    let signOut: jasmine.Spy
    let invitationFlow: ReturnType<typeof signal<boolean>>

    beforeEach(() => {
        state = signal<'idle' | 'linking' | 'ready' | 'error'>('linking')
        error = signal<string | null>(null)
        retry = jasmine.createSpy('retry')
        signOut = jasmine.createSpy('signOut').and.resolveTo()
        invitationFlow = signal(false)

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
                    },
                },
                { provide: ClerkService, useValue: { isInvitationFlow: invitationFlow } },
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

    it('offers explicit retry and sign-out recovery when linking fails', () => {
        error.set('The local account could not be loaded.')
        state.set('error')
        fixture.detectChanges()

        const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
        expect(fixture.nativeElement.textContent).toContain('We could not finish setting up your sign-in')
        expect(fixture.nativeElement.querySelector('section').getAttribute('aria-busy')).toBe('false')
        expect(buttons.length).toBe(2)

        buttons[0].click()
        buttons[1].click()

        expect(retry).toHaveBeenCalled()
        expect(signOut).toHaveBeenCalled()
    })

    it('uses group language when the handoff follows an invitation', () => {
        invitationFlow.set(true)
        error.set('The group invitation is no longer valid.')
        state.set('error')
        fixture.detectChanges()

        expect(fixture.nativeElement.textContent).toContain('We could not finish joining this group')
        expect(fixture.nativeElement.textContent).toContain('Ask the group owner for a fresh invitation')
        expect(fixture.nativeElement.textContent).not.toContain('setting up your sign-in')
    })
})
