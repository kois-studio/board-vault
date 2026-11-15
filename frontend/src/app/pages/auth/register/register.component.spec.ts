import { Component, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { ToastService } from '../../../components/toast/toast.service'
import { ClerkService } from '../../../core/services/clerk.service'
import { LandingComponent } from '../../landing/landing.component'
import { RegisterComponent } from './register.component'

@Component({ selector: 'app-landing', template: '<h1>Landing</h1>' })
class LandingStubComponent {}

describe('RegisterComponent', () => {
    function render(selfRegistrationEnabled: boolean) {
        const clerkService = {
            isConfigured: signal(true),
            isAvailable: signal(true),
            isLoaded: signal(true),
            isSelfRegistrationEnabled: signal(selfRegistrationEnabled),
            openSignUp: vi.fn().mockName('openSignUp'),
        }

        TestBed.configureTestingModule({
            imports: [RegisterComponent],
            providers: [
                provideRouter([]),
                { provide: ClerkService, useValue: clerkService },
                { provide: ToastService, useValue: { warning: vi.fn() } },
            ],
        }).overrideComponent(RegisterComponent, { remove: { imports: [LandingComponent] }, add: { imports: [LandingStubComponent] } })
        const fixture = TestBed.createComponent(RegisterComponent)
        fixture.detectChanges()

        return { fixture, clerkService, text: (fixture.nativeElement as HTMLElement).textContent ?? '' }
    }

    // #343: /register is the landing page with Clerk's own sign-up dialog open over it.
    it('shows the landing page with the sign-up dialog while sign-up is open', () => {
        const { clerkService, text } = render(true)

        expect(text).toContain('Landing')
        expect(clerkService.openSignUp).toHaveBeenCalledOnce()
    })

    it('says new accounts are paused while self-registration is off, without beta or invitation wording (#157)', () => {
        const { text, clerkService } = render(false)

        expect(text).toContain('New accounts are paused for now')
        expect(text).not.toMatch(/invite-only|private beta|invitation/i)
        expect(clerkService.openSignUp).not.toHaveBeenCalled()
    })

    it('ignores a Clerk invitation ticket in the address', () => {
        history.replaceState(null, '', '/register?__clerk_ticket=abc')

        try {
            const { text } = render(false)

            expect(text).not.toContain('Join your Board Vault group')
            expect(text).toContain('New accounts are paused for now')
        } finally {
            history.replaceState(null, '', '/')
        }
    })
})
