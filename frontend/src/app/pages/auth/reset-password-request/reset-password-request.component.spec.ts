import { TestBed } from '@angular/core/testing'
import { ActivatedRoute } from '@angular/router'
import { of, throwError } from 'rxjs'

import { Api } from '../../../api/api'

import { ResetPasswordRequestComponent } from './reset-password-request.component'

describe('ResetPasswordRequestComponent recovery UX', () => {
    const setup = async () => {
        const api = { forgotPassword: jasmine.createSpy('forgotPassword') }

        await TestBed.configureTestingModule({
            imports: [ResetPasswordRequestComponent],
            providers: [
                { provide: Api, useValue: api },
                { provide: ActivatedRoute, useValue: {} },
            ],
        }).compileComponents()

        const fixture = TestBed.createComponent(ResetPasswordRequestComponent)
        fixture.detectChanges()
        return { api, component: fixture.componentInstance }
    }

    it('submits immediately and keeps a clear success state', async () => {
        const { api, component } = await setup()
        api.forgotPassword.and.returnValue(of({ message: 'Password reset link sent' }))
        component.email?.setValue('member@example.com')

        component.onSubmit()

        expect(api.forgotPassword).toHaveBeenCalledWith('member@example.com')
        expect(component.state).toBe('success')
        expect(component.errorMessage).toBeNull()
    })

    it('explains temporary email-provider failure and returns to the form', async () => {
        const { api, component } = await setup()
        api.forgotPassword.and.returnValue(throwError(() => ({ error: { code: 'EMAIL_PROVIDER_UNAVAILABLE' } })))
        component.email?.setValue('member@example.com')

        component.onSubmit()

        expect(component.state).toBe('form')
        expect(component.errorMessage).toContain('temporarily unavailable')
    })
})
