import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { ClerkService } from '../../../core/services/clerk.service'
import { RegisterComponent } from './register.component'

describe('RegisterComponent invitation onboarding', () => {
    function createComponent(invitationSignIn: boolean) {
        const clerkService = {
            isConfigured: signal(true),
            isAvailable: signal(true),
            isSelfRegistrationEnabled: signal(false),
            isInvitationFlow: signal(true),
            isInvitationSignIn: signal(invitationSignIn),
            completeInvitationSignUp: jasmine.createSpy('completeInvitationSignUp').and.resolveTo(undefined),
        }
        const router = { navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true) }

        TestBed.configureTestingModule({
            imports: [RegisterComponent],
            providers: [
                { provide: ClerkService, useValue: clerkService },
                { provide: Router, useValue: router },
            ],
        })

        return {
            fixture: TestBed.createComponent(RegisterComponent),
            clerkService,
            router,
        }
    }

    it('lets an existing account continue without asking for replacement credentials', async () => {
        const { fixture, clerkService, router } = createComponent(true)
        const component = fixture.componentInstance

        await component.completeInvitationSignUp()

        expect(clerkService.completeInvitationSignUp).toHaveBeenCalledWith('', '')
        expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard')
    })

    it('requires the new invitee credentials before completing registration', async () => {
        const { fixture, clerkService } = createComponent(false)
        const component = fixture.componentInstance

        await component.completeInvitationSignUp()
        expect(clerkService.completeInvitationSignUp).not.toHaveBeenCalled()

        component.invitationForm.setValue({
            username: 'new-invitee',
            password: 'a'.repeat(15),
            confirmPassword: 'a'.repeat(15),
        })
        await component.completeInvitationSignUp()

        expect(clerkService.completeInvitationSignUp).toHaveBeenCalledWith('new-invitee', 'a'.repeat(15))
    })

    it('maps provider failures to safe, actionable recovery copy', async () => {
        const { fixture, clerkService } = createComponent(false)
        const component = fixture.componentInstance

        component.invitationForm.setValue({
            username: 'new-invitee',
            password: 'a'.repeat(15),
            confirmPassword: 'a'.repeat(15),
        })

        const failures = [
            [{ errors: [{ code: 'captcha_invalid' }] }, 'security check'],
            [{ errors: [{ code: 'form_identifier_exists' }] }, 'username is unavailable'],
            [{ errors: [{ code: 'form_password_pwned' }] }, 'secure sign-up requirements'],
            [{ errors: [{ code: 'ticket_expired' }] }, 'fresh invitation'],
            [new Error('provider unavailable'), 'Check the fields and security check'],
        ] as const

        for (const [failure, expectedCopy] of failures) {
            clerkService.completeInvitationSignUp.and.rejectWith(failure)
            await component.completeInvitationSignUp()

            expect(component.invitationError()).toContain(expectedCopy)
            component.invitationError.set(null)
        }

        expect(component.isInvitationSubmitting).toBeFalse()
    })
})
