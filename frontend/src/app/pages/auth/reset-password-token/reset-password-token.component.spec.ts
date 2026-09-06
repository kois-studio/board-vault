import { TestBed } from '@angular/core/testing'
import { ActivatedRoute } from '@angular/router'
import { of, throwError } from 'rxjs'

import { Api } from '../../../api/api'

import { ResetPasswordTokenComponent } from './reset-password-token.component'

describe('ResetPasswordTokenComponent recovery UX', () => {
    const setup = async (token: string | null = 'reset-token') => {
        const api = { resetPassword: jasmine.createSpy('resetPassword') }
        const route = { snapshot: { paramMap: { get: () => token } } }

        await TestBed.configureTestingModule({
            imports: [ResetPasswordTokenComponent],
            providers: [
                { provide: Api, useValue: api },
                { provide: ActivatedRoute, useValue: route },
            ],
        }).compileComponents()

        const fixture = TestBed.createComponent(ResetPasswordTokenComponent)
        fixture.detectChanges()
        return { api, component: fixture.componentInstance }
    }

    it('updates the password without an artificial delay and exposes a sign-in recovery state', async () => {
        const { api, component } = await setup()
        api.resetPassword.and.returnValue(of({ message: 'Password reset successfully' }))
        component.password?.setValue('new-password')
        component.confirmPassword?.setValue('new-password')

        component.resetPassword()

        expect(api.resetPassword).toHaveBeenCalledWith('reset-token', 'new-password')
        expect(component.state).toBe('success')
    })

    it('shows a fresh-link state when the reset token is rejected', async () => {
        const { api, component } = await setup()
        api.resetPassword.and.returnValue(throwError(() => new Error('expired')))
        component.password?.setValue('new-password')
        component.confirmPassword?.setValue('new-password')

        component.resetPassword()

        expect(component.state).toBe('error')
        expect(component.errorMessage).toContain('invalid or expired')
    })
})
