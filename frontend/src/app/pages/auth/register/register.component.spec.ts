import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { ClerkService } from '../../../core/services/clerk.service'
import { RegisterComponent } from './register.component'

describe('RegisterComponent', () => {
    function render(selfRegistrationEnabled: boolean) {
        const clerkService = {
            isConfigured: signal(true),
            isAvailable: signal(true),
            isSelfRegistrationEnabled: signal(selfRegistrationEnabled),
            openSignUp: vi.fn().mockName('openSignUp'),
        }

        TestBed.configureTestingModule({
            imports: [RegisterComponent],
            providers: [provideRouter([]), { provide: ClerkService, useValue: clerkService }],
        })
        const fixture = TestBed.createComponent(RegisterComponent)
        fixture.detectChanges()

        return { fixture, clerkService, text: (fixture.nativeElement as HTMLElement).textContent ?? '' }
    }

    it('opens Clerk sign-up while self-registration is open', () => {
        const { fixture, clerkService, text } = render(true)

        expect(text).toContain('Create your Board Vault account')
        ;(fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')?.click()
        expect(clerkService.openSignUp).toHaveBeenCalled()
    })

    it('explains access while self-registration is closed, and offers no invitation link (#277)', () => {
        const { text } = render(false)

        expect(text).toContain('Board Vault is still invite-only')
        expect(text).toContain('by your username')
        expect(text).not.toContain('sign-up link')
    })

    it('ignores a Clerk invitation ticket in the address', () => {
        history.replaceState(null, '', '/register?__clerk_ticket=abc')

        try {
            const { text } = render(false)

            expect(text).not.toContain('Join your Board Vault group')
            expect(text).toContain('Board Vault is still invite-only')
        } finally {
            history.replaceState(null, '', '/')
        }
    })
})
