import { TestBed } from '@angular/core/testing'
import { ActivatedRoute } from '@angular/router'
import { of, throwError } from 'rxjs'

import { Api } from '../../../api/api'

import { VerifyEmailComponent } from './verify-email.component'

describe('VerifyEmailComponent recovery UX', () => {
    const setup = async (token: string | null = 'verification-token') => {
        const api = { verifyEmail: jasmine.createSpy('verifyEmail') }
        const route = { snapshot: { paramMap: { get: () => token } } }

        await TestBed.configureTestingModule({
            imports: [VerifyEmailComponent],
            providers: [
                { provide: Api, useValue: api },
                { provide: ActivatedRoute, useValue: route },
            ],
        }).compileComponents()

        const component = TestBed.createComponent(VerifyEmailComponent).componentInstance
        return { api, component }
    }

    it('shows the completed state as soon as verification succeeds', async () => {
        const { api, component } = await setup()
        api.verifyEmail.and.returnValue(of({ message: 'Email successfully verified' }))

        component.verifyEmail()

        expect(api.verifyEmail).toHaveBeenCalledWith('verification-token')
        expect(component.state).toBe('success')
    })

    it('keeps an expired-link error actionable', async () => {
        const { api, component } = await setup()
        api.verifyEmail.and.returnValue(throwError(() => new Error('expired')))

        component.verifyEmail()

        expect(component.state).toBe('error')
    })
})
