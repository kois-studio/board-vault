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

    it('accepts the narrowed self-profile response without account-state fields', async () => {
        const response = firstValueFrom(api.getUserById(7))
        const request = http.expectOne(`${environment.apiUrl}/profile/users/7`)

        request.flush({
            id: 7,
            email: 'member@example.com',
            username: 'member',
            displayName: 'Member',
            avatar: { backgroundColor: '#3B82F6', iconName: 'person-fill', emoji: null, type: 'icon', initials: 'ME' },
            createdAt: '2026-09-04 12:00:00',
            isAdmin: true,
            isDeleted: false,
            email_verified: true,
        })

        const user = await response
        expect(user).toEqual(jasmine.objectContaining({ id: 7, email: 'member@example.com' }))
        expect(Object.hasOwn(user, 'isAdmin')).toBeFalse()
    })

    it('rejects a malformed self-profile response at the API boundary', async () => {
        const response = firstValueFrom(api.getUserById(7))
        const request = http.expectOne(`${environment.apiUrl}/profile/users/7`)

        request.flush({ id: 7, username: 'member', displayName: 'Member' })

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

    it('accepts the direct collection-add response used by browse activation', async () => {
        const response = firstValueFrom(api.addGameToUserCollection(1, 42))
        const request = http.expectOne(`${environment.apiUrl}/collection/users/1/games/42`)

        expect(request.request.method).toBe('POST')
        request.flush({ success: true })

        await expectAsync(response).toBeResolvedTo({ success: true })
    })

    it('accepts an empty group acquisition board as a valid social decision state', async () => {
        const response = firstValueFrom(api.getGroupAcquisitionBoard(7))
        const request = http.expectOne(`${environment.apiUrl}/groups/7/acquisition-board`)

        expect(request.request.method).toBe('GET')
        request.flush([])

        await expectAsync(response).toBeResolvedTo([])
    })

    it('validates pending Clerk group invitations at the API boundary', async () => {
        const response = firstValueFrom(api.getClerkGroupInvitations(7))
        const request = http.expectOne(`${environment.apiUrl}/groups/7/clerk-invitations`)

        expect(request.request.method).toBe('GET')
        request.flush([
            {
                invitationId: 'inv_123',
                emailAddress: 'friend@example.com',
                status: 'pending',
                createdAt: '2026-09-05T10:00:00.000Z',
            },
        ])

        await expectAsync(response).toBeResolvedTo([
            {
                invitationId: 'inv_123',
                emailAddress: 'friend@example.com',
                status: 'pending',
                createdAt: '2026-09-05T10:00:00.000Z',
            },
        ])
    })

    it('uses the group-scoped endpoint for Clerk invitation revocation', async () => {
        const response = firstValueFrom(api.revokeClerkGroupInvitation(7, 'inv_123'))
        const request = http.expectOne(`${environment.apiUrl}/groups/7/clerk-invitations/inv_123`)

        expect(request.request.method).toBe('DELETE')
        request.flush({ success: true })

        await expectAsync(response).toBeResolvedTo({ success: true })
    })

    it('rejects a provider invitation with a non-pending status', async () => {
        const response = firstValueFrom(api.getClerkGroupInvitations(7))
        const request = http.expectOne(`${environment.apiUrl}/groups/7/clerk-invitations`)

        request.flush([{ invitationId: 'inv_123', emailAddress: 'friend@example.com', status: 'revoked', createdAt: '2026-09-05' }])

        await expectAsync(response).toBeRejected()
    })

    it('rejects malformed recommendation lens responses at the API boundary', async () => {
        const response = firstValueFrom(api.getRecommendations({ groupId: 7, attendeeIds: [1], decisionLens: 'fresh' }))
        const request = http.expectOne(`${environment.apiUrl}/play/recommendations`)

        expect(request.request.body).toEqual({ groupId: 7, attendeeIds: [1], decisionLens: 'fresh' })
        request.flush({
            groupId: 7,
            attendeeIds: [1],
            availableMinutes: null,
            decisionLens: 'surprise',
            recommendations: [],
            noResultReason: null,
        })

        await expectAsync(response).toBeRejected()
    })

    it('rejects an invalid session lifecycle status before it reaches app state', async () => {
        const response = firstValueFrom(api.updateSessionStatus(12, { status: 'completed' }))
        const request = http.expectOne(`${environment.apiUrl}/sessions/12/status`)

        request.flush({ sessionId: 12, status: 'archived' })

        await expectAsync(response).toBeRejected()
    })

    it('rejects a false success envelope before it reaches app state', async () => {
        const response = firstValueFrom(
            api.createRecommendationFeedback({ groupId: 7, gameId: 42, attendeeIds: [1], feedback: 'interested' }),
        )
        const request = http.expectOne(`${environment.apiUrl}/play/recommendations/feedback`)

        request.flush({ success: false })

        await expectAsync(response).toBeRejected()
    })

    it('rejects malformed administrator pagination before it reaches app state', async () => {
        const response = firstValueFrom(api.getAdminGames())
        const request = http.expectOne(`${environment.apiUrl}/admin/games?page=1&limit=10`)

        request.flush({ games: [], pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: '10' } })

        await expectAsync(response).toBeRejected()
    })

    it('rejects malformed notification records before they reach app state', async () => {
        const response = firstValueFrom(api.getUserNotifications(7))
        const request = http.expectOne(`${environment.apiUrl}/profile/users/7/notifications`)

        request.flush([{ id: 1, accountId: 7, type: 'invitation', message: 'Join us', createdAt: '2026-09-04', isRead: 'false' }])

        await expectAsync(response).toBeRejected()
    })
})
