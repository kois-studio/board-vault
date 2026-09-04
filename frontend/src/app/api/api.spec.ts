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

    it('reads canonical session details from the member-scoped session endpoint', async () => {
        const response = firstValueFrom(api.getSessionDetailsById(12))
        const request = http.expectOne(`${environment.apiUrl}/sessions/12`)

        expect(request.request.method).toBe('GET')
        request.flush({
            id: 12,
            groupId: 7,
            createdBy: 1,
            meetDate: '2026-08-16T19:30:00.000Z',
            isConfirmed: true,
            status: 'completed',
            timezone: 'Europe/Madrid',
            notes: 'A memorable night',
            attendees: [1, 2],
            attendeeStatuses: [{ accountId: 1, rsvpStatus: 'accepted', attendanceStatus: 'attended' }],
            playedGames: [42],
            plannedGames: [],
            skippedGames: [],
            playedGameParticipants: [{ gameId: 42, participantIds: [1] }],
        })

        await expectAsync(response).toBeResolvedTo(jasmine.objectContaining({ id: 12, groupId: 7, playedGames: [42] }))
    })

    it('rejects a malformed canonical session response at the API boundary', async () => {
        const response = firstValueFrom(api.getSessionDetailsById(12))
        const request = http.expectOne(`${environment.apiUrl}/sessions/12`)

        request.flush({ id: 12, groupId: 7 })

        await expectAsync(response).toBeRejected()
    })
})
