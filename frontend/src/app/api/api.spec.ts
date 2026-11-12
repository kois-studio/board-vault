import { provideHttpClient, withXhr } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { firstValueFrom } from 'rxjs'

import openapi from '../../../../docs/api/openapi.json'
import { environment } from '../../environments/environment'

import { READ_ONLY, REQUEST_TIMEOUT_MS, RETRY_READ, WRITE_TIMEOUT_MS } from '../core/interceptors/resilience.interceptor'
import { Api } from './api'

describe('Api response contracts', () => {
    let api: Api
    let http: HttpTestingController

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [Api, provideHttpClient(withXhr()), provideHttpClientTesting()],
        })

        api = TestBed.inject(Api)
        http = TestBed.inject(HttpTestingController)
    })

    afterEach(() => http.verify())

    it('returns a typed Clerk session status for a valid response', async () => {
        const response = firstValueFrom(api.clerkAuthStatus())
        const request = http.expectOne(`${environment.apiUrl}/auth/clerk/status`)

        expect(request.request.method).toBe('GET')
        request.flush({ isValid: true, userId: 7, isAdmin: false, clerkUserId: 'user_member' })

        await expect(response).resolves.toEqual({ isValid: true, userId: 7, isAdmin: false, clerkUserId: 'user_member' })
    })

    it('leaves retrying the Clerk session status to the sign-in handoff, and lets other reads be tried again (#240)', () => {
        api.clerkAuthStatus().subscribe()
        api.getUserById(7).subscribe()

        expect(http.expectOne(`${environment.apiUrl}/auth/clerk/status`).request.context.get(RETRY_READ)).toBe(false)
        expect(http.expectOne(`${environment.apiUrl}/profile/users/7`).request.context.get(RETRY_READ)).toBe(true)
    })

    it('gives an artwork upload longer than an ordinary write (#240)', () => {
        api.uploadGameArtwork(4, new Blob(['x'], { type: 'image/png' })).subscribe()
        const limit = http.expectOne(`${environment.apiUrl}/admin/games/4/artwork`).request.context.get(REQUEST_TIMEOUT_MS)

        expect(limit).toBeGreaterThan(WRITE_TIMEOUT_MS)
    })

    it('treats the recommendation POSTs as reads, and their feedback as writes (#240)', () => {
        const body = { groupId: 1, attendeeIds: [2], gameId: 3, feedback: 'played' as const }
        api.getRecommendations(body).subscribe()
        api.getParticipantRecommendations({ groupId: 1, groupPersonIds: [2] }).subscribe()
        api.createRecommendationFeedback(body).subscribe()

        expect(http.expectOne(`${environment.apiUrl}/play/recommendations`).request.context.get(READ_ONLY)).toBe(true)
        expect(http.expectOne(`${environment.apiUrl}/play/recommendations/participants`).request.context.get(READ_ONLY)).toBe(true)
        expect(http.expectOne(`${environment.apiUrl}/play/recommendations/feedback`).request.context.get(READ_ONLY)).toBe(false)
    })

    it('sends the Idempotency-Key with a game night it creates, and no header without one (#246)', () => {
        const key = '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b'
        const body = { groupId: 1, sessionDate: '2026-10-06T17:00:00.000Z', timezone: 'Europe/Madrid', plannedGameIds: [] }
        api.createPlaySession({ ...body, games: [] }, key).subscribe()
        api.scheduleSession(body, key).subscribe()
        api.startLiveSession(body, key).subscribe()
        api.scheduleSession(body).subscribe()

        expect(http.expectOne(`${environment.apiUrl}/sessions`).request.headers.get('Idempotency-Key')).toBe(key)
        expect(http.expectOne(`${environment.apiUrl}/sessions/live`).request.headers.get('Idempotency-Key')).toBe(key)
        const [keyed, unkeyed] = http.match(`${environment.apiUrl}/sessions/scheduled`)
        expect(keyed?.request.headers.get('Idempotency-Key')).toBe(key)
        expect(unkeyed?.request.headers.has('Idempotency-Key')).toBe(false)
    })

    it('rejects a Clerk session status with an invalid user id before it reaches the app', async () => {
        const response = firstValueFrom(api.clerkAuthStatus())
        const request = http.expectOne(`${environment.apiUrl}/auth/clerk/status`)

        request.flush({ isValid: true, userId: '7', isAdmin: false, clerkUserId: 'user_member' })

        await expect(response).rejects.toThrow()
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
        })

        const user = await response
        expect(user).toEqual(expect.objectContaining({ id: 7, email: 'member@example.com' }))
        expect(Object.hasOwn(user, 'isAdmin')).toBe(false)
    })

    it('rejects a malformed self-profile response at the API boundary', async () => {
        const response = firstValueFrom(api.getUserById(7))
        const request = http.expectOne(`${environment.apiUrl}/profile/users/7`)

        request.flush({ id: 7, username: 'member', displayName: 'Member' })

        await expect(response).rejects.toThrow()
    })

    it('rejects a malformed group workspace response at the API boundary', async () => {
        const response = firstValueFrom(api.getUserGroups(7))
        const request = http.expectOne(`${environment.apiUrl}/dashboard/users/7/groups`)

        request.flush([{ id: 7, name: 'Friday Crew', createdBy: 1, createdAt: '2026-09-04' }])

        await expect(response).rejects.toThrow()
    })

    it('accepts the group-person workspace and its actor-specific claim flag', async () => {
        const response = firstValueFrom(api.getGroupPeople(7))
        const request = http.expectOne(`${environment.apiUrl}/groups/7/people`)

        request.flush({
            people: [
                {
                    person: {
                        id: 21,
                        groupId: 7,
                        accountId: null,
                        kind: 'placeholder',
                        status: 'active',
                        displayName: 'Ana',
                        avatar: null,
                        createdAt: '2026-09-26T10:00:00.000Z',
                        updatedAt: '2026-09-26T10:00:00.000Z',
                        claimedAt: null,
                    },
                    ownership: [],
                    preferences: [],
                    claimable: true,
                    suggested: false,
                },
            ],
        })

        await expect(response).resolves.toEqual(expect.objectContaining({ people: [expect.objectContaining({ claimable: true })] }))
    })

    it('rejects a malformed shared-history response at the API boundary', async () => {
        const response = firstValueFrom(api.getUserGamesHistory(7))
        const request = http.expectOne(`${environment.apiUrl}/play/users/7/history/page`)

        request.flush({ entries: [{ meetData: { id: 12, groupId: 7 }, attendedBy: [], gamesPlayed: [] }], hasMore: false })

        await expect(response).rejects.toThrow()
    })

    it('asks for one page of history, after a night and within a group or game, and reads it (#252)', async () => {
        const response = firstValueFrom(api.getUserGamesHistory(7, { before: 30, limit: 6, groupId: 3, gameId: 42 }))
        const request = http.expectOne((req) => req.url === `${environment.apiUrl}/play/users/7/history/page`)

        expect(request.request.params.keys()).toEqual(['before', 'limit', 'groupId', 'gameId'])
        expect(request.request.urlWithParams).toContain('before=30&limit=6&groupId=3&gameId=42')
        request.flush({ entries: [], hasMore: true })

        await expect(response).resolves.toEqual({ entries: [], hasMore: true })
    })

    it('reads the history totals, only for the filters given', async () => {
        const summary = { nights: 3, gamesPlayed: 4, uniqueGames: 2, people: 5, mostPlayed: null, myMostPlayed: [] }
        const response = firstValueFrom(api.getUserHistorySummary(7, { gameId: 42 }))
        const request = http.expectOne((req) => req.url === `${environment.apiUrl}/play/users/7/history/summary`)

        expect(request.request.urlWithParams).toBe(`${environment.apiUrl}/play/users/7/history/summary?gameId=42`)
        request.flush(summary)

        await expect(response).resolves.toEqual(summary)
    })

    it('rejects history totals without their numbers', async () => {
        const response = firstValueFrom(api.getUserHistorySummary(7))
        http.expectOne(`${environment.apiUrl}/play/users/7/history/summary`).flush({ nights: 3 })

        await expect(response).rejects.toThrow()
    })

    it('reads one group’s nights around a day, and rejects an answer without its records', async () => {
        const meet = {
            id: 40,
            groupId: 3,
            createdBy: 1,
            meetDate: '2026-01-15T19:00:00.000Z',
            isConfirmed: true,
            status: 'completed',
            timezone: 'UTC',
            notes: null,
        }
        const response = firstValueFrom(api.getMeetsAround(7, 3, '2026-01-15'))
        const request = http.expectOne((req) => req.url === `${environment.apiUrl}/play/users/7/meets/around`)

        expect(request.request.urlWithParams).toBe(`${environment.apiUrl}/play/users/7/meets/around?groupId=3&date=2026-01-15`)
        request.flush({ meets: [meet], records: [] })

        await expect(response).resolves.toEqual({ meets: [meet], records: [] })

        const broken = firstValueFrom(api.getMeetsAround(7, 3, '2026-01-15'))
        http.expectOne((req) => req.url === `${environment.apiUrl}/play/users/7/meets/around`).flush({ meets: [meet] })

        await expect(broken).rejects.toThrow()
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

        await expect(response).resolves.toEqual(expect.objectContaining({ id: 12, groupId: 7, playedGames: [42] }))
    })

    it('rejects a malformed canonical session response at the API boundary', async () => {
        const response = firstValueFrom(api.getSessionDetailsById(12))
        const request = http.expectOne(`${environment.apiUrl}/sessions/12`)

        request.flush({ id: 12, groupId: 7 })

        await expect(response).rejects.toThrow()
    })

    it('accepts the direct collection-add response used by browse activation', async () => {
        const response = firstValueFrom(api.addGameToUserCollection(1, 42))
        const request = http.expectOne(`${environment.apiUrl}/collection/users/1/games/42`)

        expect(request.request.method).toBe('POST')
        request.flush({ success: true })

        await expect(response).resolves.toEqual({ success: true })
    })

    it('accepts an empty group acquisition board as a valid social decision state', async () => {
        const response = firstValueFrom(api.getGroupAcquisitionBoard(7))
        const request = http.expectOne(`${environment.apiUrl}/groups/7/acquisition-board`)

        expect(request.request.method).toBe('GET')
        request.flush([])

        await expect(response).resolves.toEqual([])
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

        await expect(response).rejects.toThrow()
    })

    it('rejects an invalid session lifecycle status before it reaches app state', async () => {
        const response = firstValueFrom(api.updateSessionStatus(12, { status: 'completed' }))
        const request = http.expectOne(`${environment.apiUrl}/sessions/12/status`)

        request.flush({ sessionId: 12, status: 'archived' })

        await expect(response).rejects.toThrow()
    })

    it('rejects a false success envelope before it reaches app state', async () => {
        const response = firstValueFrom(
            api.createRecommendationFeedback({ groupId: 7, gameId: 42, attendeeIds: [1], feedback: 'interested' }),
        )
        const request = http.expectOne(`${environment.apiUrl}/play/recommendations/feedback`)

        request.flush({ success: false })

        await expect(response).rejects.toThrow()
    })

    it('rejects malformed administrator pagination before it reaches app state', async () => {
        const response = firstValueFrom(api.getAdminGames())
        const request = http.expectOne(`${environment.apiUrl}/admin/games?page=1&limit=10`)

        request.flush({ games: [], pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: '10' } })

        await expect(response).rejects.toThrow()
    })

    it('rejects malformed notification records before they reach app state', async () => {
        const response = firstValueFrom(api.getUserNotifications(7))
        const request = http.expectOne(`${environment.apiUrl}/profile/users/7/notifications`)

        request.flush([{ id: 1, accountId: 7, type: 'invitation', message: 'Join us', createdAt: '2026-09-04', isRead: 'false' }])

        await expect(response).rejects.toThrow()
    })

    it("keeps the account behind each group person in the history, so own changes read as the member's own", async () => {
        const response = firstValueFrom(api.getGroupActivity(10))
        const request = http.expectOne(`${environment.apiUrl}/groups/10/activity`)

        request.flush({
            entries: [
                {
                    id: 1,
                    type: 'person_game_set',
                    createdAt: '2026-10-17 10:45:13',
                    actor: { id: 6, name: 'Bloody', standing: 'member' },
                    meetId: null,
                    person: { id: 3, name: 'Bloody', standing: 'member', accountId: 6 },
                    game: { id: 58, title: 'Casting Shadows', titleLanguage: 'en' },
                    subject: null,
                    data: { status: 'asserted', previousStatus: null },
                    accounts: [],
                    people: [{ id: 4, name: 'Pedro', standing: 'member', accountId: null }],
                    games: [],
                },
            ],
            hasMore: false,
        })

        const [entry] = (await response).entries
        expect(entry?.person).toEqual({ id: 3, name: 'Bloody', standing: 'member', accountId: 6 })
        expect(entry?.people).toEqual([{ id: 4, name: 'Pedro', standing: 'member', accountId: null }])
    })

    it('keeps the account behind each group person a notification names', async () => {
        const response = firstValueFrom(api.getUserNotifications(7))
        const request = http.expectOne(`${environment.apiUrl}/profile/users/7/notifications`)

        request.flush([
            {
                id: 1,
                accountId: 7,
                type: 'group_person_changed',
                message: 'Bloody said they have Casting Shadows, in Fridays.',
                createdAt: '2026-10-17 10:45:13',
                isRead: false,
                context: { accounts: [], groups: [], sessions: [], people: [{ id: 3, name: 'Bloody', accountId: 6 }], games: [] },
            },
        ])

        const [notification] = await response
        expect(notification?.context?.people).toEqual([{ id: 3, name: 'Bloody', accountId: 6 }])
    })

    it('rejects a malformed acquisition decision entry at the API boundary', async () => {
        const response = firstValueFrom(api.getGroupAcquisitionBoard(7))
        const request = http.expectOne(`${environment.apiUrl}/groups/7/acquisition-board`)

        request.flush([
            {
                gameData: { id: 42 },
                interestedBy: [],
                interestCount: 0,
                ownerCount: 0,
                firstInterestedAt: '2026-09-05',
                decisionStatus: 'open',
                decisionAt: null,
                decisionBy: null,
            },
        ])

        await expect(response).rejects.toThrow()
    })

    it('rejects a malformed recommendation-signal response at the API boundary', async () => {
        const response = firstValueFrom(api.getRecommendationSignals(7))
        const request = http.expectOne(`${environment.apiUrl}/play/recommendations/signals?groupId=7`)

        request.flush({ groupId: 7, signals: [{ gameId: 42, interestedCount: 1 }] })

        await expect(response).rejects.toThrow()
    })

    it('rejects a scheduled-session response that does not confirm scheduling', async () => {
        const response = firstValueFrom(
            api.scheduleSession({
                groupId: 7,
                sessionDate: '2026-09-12T19:30:00.000Z',
                timezone: 'Europe/Madrid',
                attendeeIds: [1, 2],
                plannedGameIds: [42],
            }),
        )
        const request = http.expectOne(`${environment.apiUrl}/sessions/scheduled`)

        request.flush({ sessionId: 12, status: 'completed' })

        await expect(response).rejects.toThrow()
    })

    it('rejects a malformed legacy user-invitation response at the API boundary', async () => {
        const response = firstValueFrom(api.getUserInvitations(8))
        const request = http.expectOne(`${environment.apiUrl}/profile/users/8/invitations`)

        request.flush([
            {
                id: 12,
                groupId: 7,
                fromAccountId: 1,
                toAccountId: 8,
                sentAt: '2026-09-05T10:00:00.000Z',
                expiresAt: '2026-10-05T10:00:00.000Z',
                fromAccount: { id: 1, username: 'owner', displayName: 'Owner' },
                group: { id: 7, name: 'Friday games', createdBy: 1, createdAt: '2026-09-01T10:00:00.000Z' },
            },
        ])

        await expect(response).rejects.toThrow()
    })

    it('accepts admin tag categories in the shape the API documents', async () => {
        const { properties } = openapi.components.schemas.TagCategoryWithTagsDto
        const category = {
            id: properties.id.example,
            name: properties.name.example,
            tags: properties.tags.example,
            gameCount: properties.gameCount.example,
        }
        const response = firstValueFrom(api.getAdminTagCategories())

        http.expectOne(`${environment.apiUrl}/admin/tag-categories`).flush([category])

        // `translations` is optional in the contract; without it there are none yet.
        await expect(response).resolves.toEqual([{ ...category, translations: {} }])
    })

    it('rejects admin tag categories that carry tag objects instead of ids', async () => {
        const response = firstValueFrom(api.getAdminTagCategories())

        http.expectOne(`${environment.apiUrl}/admin/tag-categories`).flush([
            { id: 1, name: 'Genre', tags: [{ id: 3, name: 'Strategy', categoryId: 1, gameCount: 2 }], gameCount: 2 },
        ])

        await expect(response).rejects.toThrow()
    })
})
