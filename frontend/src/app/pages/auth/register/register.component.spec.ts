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

    it('keeps invitation failure actionable when the ticket or group is no longer available', async () => {
        const { fixture, clerkService } = createComponent(false)
        clerkService.completeInvitationSignUp.and.rejectWith(new Error('expired'))
        const component = fixture.componentInstance

        component.invitationForm.setValue({
            username: 'new-invitee',
            password: 'a'.repeat(15),
            confirmPassword: 'a'.repeat(15),
        })
        await component.completeInvitationSignUp()

        expect(component.invitationError()).toContain('fresh invitation')
        expect(component.isInvitationSubmitting).toBeFalse()
    })
})
