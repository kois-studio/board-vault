import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { firstValueFrom } from 'rxjs'

import { environment } from '../../environments/environment'

import { Api } from './api'

describe('Api response contracts', () => {
    let api: Api
    let http: HttpTestingController

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [Api, provideHttpClient(), provideHttpClientTesting()],
        })

        api = TestBed.inject(Api)
        http = TestBed.inject(HttpTestingController)
    })

    afterEach(() => http.verify())

    it('returns a typed auth status for a valid response', async () => {
        const response = firstValueFrom(api.authStatus())
        const request = http.expectOne(`${environment.apiUrl}/auth/status`)

        expect(request.request.method).toBe('GET')
        request.flush({ isValid: true, userId: 7, isAdmin: false })

        await expectAsync(response).toBeResolvedTo({ isValid: true, userId: 7, isAdmin: false })
    })

    it('rejects an auth status with an invalid user id before it reaches the app', async () => {
        const response = firstValueFrom(api.authStatus())
        const request = http.expectOne(`${environment.apiUrl}/auth/status`)

        request.flush({ isValid: true, userId: '7', isAdmin: false })

        await expectAsync(response).toBeRejected()
    })
})
