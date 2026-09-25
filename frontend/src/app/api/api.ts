import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { map } from 'rxjs'
import { environment } from '../../environments/environment'
import {
    accessTokenSchema,
    adminApprovalResponseSchema,
    adminGameProposalSchema,
    adminGameProposalsSchema,
    adminGamesSchema,
    adminSuccessResponseSchema,
    adminTagCategoriesSchema,
    adminTagsSchema,
    authStatusSchema,
    availabilitySchema,
    browseGamesSchema,
    clerkAuthStatusSchema,
    clerkGroupInvitationSchema,
    clerkGroupInvitationSummariesSchema,
    createdGroupSchema,
    gameOwnedSchema,
    gameProposalSchema,
    gameViewSchema,
    gamesSchema,
    groupAcquisitionBoardSchema,
    groupInvitationsSchema,
    groupPeopleSchema,
    groupPersonSchemaResponse,
    meetDetailsSchema,
    meetSchema,
    messageSchema,
    publicUserSchema,
    recommendationSignalsSchema,
    recommendationsSchema,
    scheduledSessionCreatedSchema,
    sessionAttendanceUpdatedSchema,
    sessionAttendeesUpdatedSchema,
    sessionCreatedSchema,
    sessionPlayedGamesUpdatedSchema,
    sessionRsvpUpdatedSchema,
    sessionShortlistUpdatedSchema,
    sessionStatusUpdatedSchema,
    successSchema,
    tagCategorySchema,
    tagSchema,
    userCollectionActivitySchema,
    userGamesSchema,
    userGroupsSchema,
    userHistorySchema,
    userInvitationsSchema,
    userMeetsSchema,
    userNotificationsSchema,
    userProposalStatsSchema,
    userProposalsSchema,
    userReviewsSchema,
    userSchema,
    userStatsSchema,
    wishlistResponseSchema,
} from './api.schemas'
import type {
    AdminGamesResultType,
    BrowseGamesResultType,
    ClerkGroupInvitationSummaryType,
    ClerkGroupInvitationType,
    CollectionActivityWithGameDataType,
    CreateGameProposalType,
    CreatePlaySessionRequest,
    GameCompleteType,
    GameOwnedType,
    GameProposalType,
    GameReviewWithGameData,
    GameType,
    GameViewType,
    GameWithTagsAndTranslationsType,
    GroupAcquisitionEntryType,
    GroupPersonType,
    GroupPersonWorkspaceType,
    GroupWithMembersAndGames,
    HistoryRecordType,
    InvitationWithAccountsData,
    InvitationWithExtraData,
    MeetType,
    MeetWithAttendeesAndGamesType,
    NotificationType,
    PublicUserType,
    RecommendationSignalsType,
    RecommendationsType,
    ScheduleSessionRequest,
    ScheduledSessionCreatedType,
    SessionAttendanceUpdatedType,
    SessionAttendeesUpdatedType,
    SessionCreatedType,
    SessionPlayedGamesUpdatedType,
    SessionRsvpUpdatedType,
    SessionShortlistUpdatedType,
    SessionStatusUpdatedType,
    TagCategoryType,
    TagType,
    UpdateGameOwnedType,
    UpdateSessionAttendanceRequest,
    UpdateSessionAttendeesRequest,
    UpdateSessionPlayedGamesRequest,
    UpdateSessionRsvpRequest,
    UpdateSessionShortlistRequest,
    UpdateSessionStatusRequest,
    UserProposalStatsType,
    UserStatsType,
    UserType,
} from './api.types'

@Injectable({ providedIn: 'root' })
export class Api {
    private readonly url = environment.apiUrl

    constructor(private readonly http: HttpClient) {}

    // #region auth

    authStatus() {
        // there is no case where the response is `isValid: false`.
        // if token not valid, the server returns 401 error, not a valid response.
        return this.http
            .get<{ isValid: true; userId: number; isAdmin: boolean }>(`${this.url}/auth/status`)
            .pipe(map((response) => authStatusSchema.parse(response)))
    }

    clerkAuthStatus() {
        return this.http
            .get<{
                isValid: true
                userId: number
                isAdmin: boolean
                clerkUserId: string
            }>(`${this.url}/auth/clerk/status`)
            .pipe(map((response) => clerkAuthStatusSchema.parse(response)))
    }

    login(email: string, password: string) {
        return this.http
            .post<{ access_token: string }>(`${this.url}/auth/login`, { email, password })
            .pipe(map((response) => accessTokenSchema.parse(response)))
    }

    register(email: string, username: string, password: string) {
        return this.http
            .post<{ success: true }>(`${this.url}/auth/register`, { email, username, password })
            .pipe(map((response) => successSchema.parse(response)))
    }

    checkEmail(email: string) {
        return this.http
            .get<{ isAvailable: boolean }>(`${this.url}/auth/check-email?${new URLSearchParams({ email }).toString()}`)
            .pipe(map((response) => availabilitySchema.parse(response)))
    }

    checkUsername(username: string) {
        return this.http
            .get<{ isAvailable: boolean }>(`${this.url}/auth/check-username?${new URLSearchParams({ username }).toString()}`)
            .pipe(map((response) => availabilitySchema.parse(response)))
    }

    verifyEmail(token: string) {
        return this.http
            .get<{ message: string }>(`${this.url}/auth/verify-email/${token}`)
            .pipe(map((response) => messageSchema.parse(response)))
    }

    forgotPassword(email: string) {
        return this.http
            .post<{ message: string }>(`${this.url}/auth/forgot-password`, { email })
            .pipe(map((response) => messageSchema.parse(response)))
    }

    resetPassword(token: string, password: string) {
        return this.http
            .post<{ message: string }>(`${this.url}/auth/reset-password/${token}`, { password })
            .pipe(map((response) => messageSchema.parse(response)))
    }

    // #region users

    updateUser(
        userId: number,
        requesBody: {
            username?: string
            displayName?: string
            avatar?: UserType['avatar']
        },
    ) {
        return this.http
            .put<{ success: true }>(`${this.url}/users/${userId}`, requesBody)
            .pipe(map((response) => successSchema.parse(response)))
    }

    updateUserGames(userId: number, gamesToAdd: Array<number>, gamesToRemove: Array<number>) {
        return this.http
            .put<{ success: true }>(`${this.url}/users/${userId}/games`, { gamesToAdd, gamesToRemove })
            .pipe(map((response) => successSchema.parse(response)))
    }

    // #region groups

    getGroupInvitations(groupId: number) {
        return this.http
            .get<Array<InvitationWithAccountsData>>(`${this.url}/groups/${groupId}/invitations`)
            .pipe(map((response) => groupInvitationsSchema.parse(response)))
    }

    createClerkGroupInvitation(groupId: number, emailAddress: string) {
        return this.http
            .post<ClerkGroupInvitationType>(`${this.url}/groups/${groupId}/clerk-invitations`, { emailAddress })
            .pipe(map((response) => clerkGroupInvitationSchema.parse(response)))
    }

    getClerkGroupInvitations(groupId: number) {
        return this.http
            .get<Array<ClerkGroupInvitationSummaryType>>(`${this.url}/groups/${groupId}/clerk-invitations`)
            .pipe(map((response) => clerkGroupInvitationSummariesSchema.parse(response)))
    }

    revokeClerkGroupInvitation(groupId: number, invitationId: string) {
        return this.http
            .delete<{ success: true }>(`${this.url}/groups/${groupId}/clerk-invitations/${invitationId}`)
            .pipe(map((response) => successSchema.parse(response)))
    }

    // #region games

    getGames() {
        return this.http.get<Array<GameType>>(`${this.url}/games`).pipe(map((response) => gamesSchema.parse(response)))
    }

    // #region invitations

    deleteInvitation(invitationId: number) {
        return this.http
            .delete<{ success: true }>(`${this.url}/invitations/${invitationId}`)
            .pipe(map((response) => successSchema.parse(response)))
    }

    rejectInvitation(invitationId: number) {
        return this.http
            .post<{ success: true }>(`${this.url}/invitations/${invitationId}/reject`, {})
            .pipe(map((response) => successSchema.parse(response)))
    }

    createInvitation(groupId: number, username: string) {
        return this.http
            .post<PublicUserType>(`${this.url}/invitations/byUsername`, { groupId, username })
            .pipe(map((response) => publicUserSchema.parse(response)))
    }

    // #region notifications

    deleteNotification(notificationId: number) {
        return this.http
            .delete<{ success: true }>(`${this.url}/notifications/${notificationId}`)
            .pipe(map((response) => successSchema.parse(response)))
    }

    updateNotification(notificationId: number, partialNotification: Partial<NotificationType>) {
        return this.http
            .put<{ success: true }>(`${this.url}/notifications/${notificationId}`, {
                isRead: partialNotification.isRead,
            })
            .pipe(map((response) => successSchema.parse(response)))
    }

    // #region meetings

    getMeetById(meetId: number) {
        return this.http.get<MeetType>(`${this.url}/meets/${meetId}`).pipe(map((response) => meetSchema.parse(response)))
    }

    getMeetDetailsById(meetId: number) {
        return this.http
            .get<MeetWithAttendeesAndGamesType>(`${this.url}/meets/${meetId}/details`)
            .pipe(map((response) => meetDetailsSchema.parse(response)))
    }

    getSessionDetailsById(sessionId: number) {
        return this.http
            .get<MeetWithAttendeesAndGamesType>(`${this.url}/sessions/${sessionId}`)
            .pipe(map((response) => meetDetailsSchema.parse(response)))
    }

    createPlaySession(body: CreatePlaySessionRequest) {
        return this.http
            .post<SessionCreatedType>(`${this.url}/sessions`, body)
            .pipe(map((response) => sessionCreatedSchema.parse(response)))
    }

    scheduleSession(body: ScheduleSessionRequest) {
        return this.http
            .post<ScheduledSessionCreatedType>(`${this.url}/sessions/scheduled`, body)
            .pipe(map((response) => scheduledSessionCreatedSchema.parse(response)))
    }

    updateSessionStatus(sessionId: number, body: UpdateSessionStatusRequest) {
        return this.http
            .patch<SessionStatusUpdatedType>(`${this.url}/sessions/${sessionId}/status`, body)
            .pipe(map((response) => sessionStatusUpdatedSchema.parse(response)))
    }

    updateSessionAttendees(sessionId: number, body: UpdateSessionAttendeesRequest) {
        return this.http
            .patch<SessionAttendeesUpdatedType>(`${this.url}/sessions/${sessionId}/attendees`, body)
            .pipe(map((response) => sessionAttendeesUpdatedSchema.parse(response)))
    }

    updateSessionShortlist(sessionId: number, body: UpdateSessionShortlistRequest) {
        return this.http
            .patch<SessionShortlistUpdatedType>(`${this.url}/sessions/${sessionId}/shortlist`, body)
            .pipe(map((response) => sessionShortlistUpdatedSchema.parse(response)))
    }

    updateSessionPlayedGames(sessionId: number, body: UpdateSessionPlayedGamesRequest) {
        return this.http
            .patch<SessionPlayedGamesUpdatedType>(`${this.url}/sessions/${sessionId}/played-games`, body)
            .pipe(map((response) => sessionPlayedGamesUpdatedSchema.parse(response)))
    }

    updateSessionRsvp(sessionId: number, body: UpdateSessionRsvpRequest) {
        return this.http
            .patch<SessionRsvpUpdatedType>(`${this.url}/sessions/${sessionId}/rsvp`, body)
            .pipe(map((response) => sessionRsvpUpdatedSchema.parse(response)))
    }

    updateSessionAttendance(sessionId: number, body: UpdateSessionAttendanceRequest) {
        return this.http
            .patch<SessionAttendanceUpdatedType>(`${this.url}/sessions/${sessionId}/attendance`, body)
            .pipe(map((response) => sessionAttendanceUpdatedSchema.parse(response)))
    }

    // --------------------------------------------------------------------------
    // #region admin
    // --------------------------------------------------------------------------
    getAdminTagCategories() {
        return this.http
            .get<Array<TagCategoryType>>(`${this.url}/admin/tag-categories`)
            .pipe(map((response) => adminTagCategoriesSchema.parse(response)))
    }

    createAdminTagCategory(name: string) {
        return this.http
            .post<TagCategoryType>(`${this.url}/admin/tag-categories`, { name })
            .pipe(map((response) => tagCategorySchema.parse(response)))
    }

    updateAdminTagCategory(id: number, name: string) {
        return this.http
            .put<TagCategoryType>(`${this.url}/admin/tag-categories/${id}`, { name })
            .pipe(map((response) => tagCategorySchema.parse(response)))
    }

    deleteAdminTagCategory(id: number) {
        return this.http
            .delete<{ success: true }>(`${this.url}/admin/tag-categories/${id}`)
            .pipe(map((response) => successSchema.parse(response)))
    }

    getAdminTags() {
        return this.http.get<Array<TagType>>(`${this.url}/admin/tags`).pipe(map((response) => adminTagsSchema.parse(response)))
    }

    createAdminTag(payload: { name: string; categoryId: number }) {
        return this.http.post<TagType>(`${this.url}/admin/tags`, payload).pipe(map((response) => tagSchema.parse(response)))
    }

    updateAdminTag(id: number, payload: { name: string; categoryId: number }) {
        return this.http.put<TagType>(`${this.url}/admin/tags/${id}`, payload).pipe(map((response) => tagSchema.parse(response)))
    }

    deleteAdminTag(id: number) {
        return this.http.delete<{ success: true }>(`${this.url}/admin/tags/${id}`).pipe(map((response) => successSchema.parse(response)))
    }

    // #region Admin Games

    getAdminGames(search = '', page = 1, limit = 10) {
        const params = new URLSearchParams()
        if (search) params.append('search', search)
        params.append('page', page.toString())
        params.append('limit', limit.toString())

        return this.http
            .get<AdminGamesResultType>(`${this.url}/admin/games?${params.toString()}`)
            .pipe(map((response) => adminGamesSchema.parse(response)))
    }

    updateAdminGameTranslations(gameId: number, translations: Record<string, string>) {
        return this.http
            .put<{ success: true }>(`${this.url}/admin/games/${gameId}/translations`, translations)
            .pipe(map((response) => successSchema.parse(response)))
    }

    updateAdminGameTags(gameId: number, tagIds: number[]) {
        return this.http
            .put<{ success: true }>(`${this.url}/admin/games/${gameId}/tags`, { tagIds })
            .pipe(map((response) => successSchema.parse(response)))
    }

    // #endregion

    // --------------------------------------------------------------------------
    // #region collection
    // --------------------------------------------------------------------------
    getUserGames(userId: number) {
        return this.http
            .get<Array<GameCompleteType>>(`${this.url}/collection/users/${userId}/games`)
            .pipe(map((response) => userGamesSchema.parse(response)))
    }

    browseGamesNotOwnedByUser(userId: number, search: string, page: number, limit: number) {
        const params = new URLSearchParams({ search, page: page.toString(), limit: limit.toString() })
        return this.http
            .get<BrowseGamesResultType>(`${this.url}/collection/users/${userId}/browse/games?${params.toString()}`)
            .pipe(map((response) => browseGamesSchema.parse(response)))
    }

    getGameView(userId: number, gameId: number) {
        return this.http
            .get<GameViewType>(`${this.url}/collection/users/${userId}/games/${gameId}`)
            .pipe(map((response) => gameViewSchema.parse(response)))
    }

    addGameToUserCollection(userId: number, gameId: number) {
        return this.http
            .post<{ success: true }>(`${this.url}/collection/users/${userId}/games/${gameId}`, {})
            .pipe(map((response) => successSchema.parse(response)))
    }

    removeGameFromUserCollection(userId: number, gameId: number) {
        return this.http
            .delete<{ success: true }>(`${this.url}/collection/users/${userId}/games/${gameId}`)
            .pipe(map((response) => successSchema.parse(response)))
    }

    patchGameOwnership(userId: number, gameId: number, ownedGameDto: UpdateGameOwnedType) {
        return this.http
            .patch<GameOwnedType>(`${this.url}/collection/users/${userId}/games/${gameId}/ownership`, ownedGameDto)
            .pipe(map((response) => gameOwnedSchema.parse(response)))
    }

    toggleWishlist(userId: number, gameId: number) {
        return this.http
            .put<{ isWishlisted: boolean }>(`${this.url}/collection/users/${userId}/games/${gameId}/wishlist`, {})
            .pipe(map((response) => wishlistResponseSchema.parse(response)))
    }

    getUserReviews(userId: number) {
        return this.http
            .get<Array<GameReviewWithGameData>>(`${this.url}/collection/users/${userId}/reviews`)
            .pipe(map((response) => userReviewsSchema.parse(response)))
    }

    saveGameReview(userId: number, gameId: number, review: number) {
        return this.http
            .post<{ success: true }>(`${this.url}/collection/users/${userId}/reviews/${gameId}`, { review })
            .pipe(map((response) => successSchema.parse(response)))
    }

    getUserWishlist(userId: number) {
        return this.http
            .get<Array<GameCompleteType>>(`${this.url}/collection/users/${userId}/wishlist`)
            .pipe(map((response) => userGamesSchema.parse(response)))
    }

    getUserCollectionActivity(userId: number) {
        return this.http
            .get<Array<CollectionActivityWithGameDataType>>(`${this.url}/collection/users/${userId}/recent-activity`)
            .pipe(map((response) => userCollectionActivitySchema.parse(response)))
    }

    // --------------------------------------------------------------------------
    // #region dashboard
    // --------------------------------------------------------------------------
    getUserStats(userId: number) {
        return this.http
            .get<UserStatsType>(`${this.url}/dashboard/users/${userId}/stats`)
            .pipe(map((response) => userStatsSchema.parse(response)))
    }

    getUserGroups(userId: number) {
        return this.http
            .get<Array<GroupWithMembersAndGames>>(`${this.url}/dashboard/users/${userId}/groups`)
            .pipe(map((response) => userGroupsSchema.parse(response)))
    }

    createGroup(userId: number, groupName: string) {
        return this.http
            .post<{ success: true; groupId: number }>(
                `${this.url}/dashboard/users/${userId}/groups/create/${encodeURIComponent(groupName)}`,
                {},
            )
            .pipe(map((response) => createdGroupSchema.parse(response)))
    }

    deleteGroup(userId: number, groupId: number) {
        return this.http
            .delete<{ success: true }>(`${this.url}/dashboard/users/${userId}/groups/${groupId}`, {})
            .pipe(map((response) => successSchema.parse(response)))
    }

    getGroupMeetings(userId: number, groupId: number) {
        return this.http
            .get<Array<HistoryRecordType>>(`${this.url}/dashboard/users/${userId}/groups/${groupId}/meetings`)
            .pipe(map((response) => userHistorySchema.parse(response)))
    }

    getGroupAcquisitionBoard(groupId: number) {
        return this.http
            .get<Array<GroupAcquisitionEntryType>>(`${this.url}/groups/${groupId}/acquisition-board`)
            .pipe(map((response) => groupAcquisitionBoardSchema.parse(response)))
    }

    getGroupPeople(groupId: number) {
        return this.http
            .get<{ people: Array<GroupPersonWorkspaceType> }>(`${this.url}/groups/${groupId}/people`)
            .pipe(map((response) => groupPeopleSchema.parse(response)))
    }

    createGroupPerson(groupId: number, displayName: string) {
        return this.http
            .post<GroupPersonType>(`${this.url}/groups/${groupId}/people`, { displayName })
            .pipe(map((response) => groupPersonSchemaResponse.parse(response)))
    }

    updateGroupPerson(groupId: number, personId: number, body: { displayName?: string; status?: 'active' | 'archived' }) {
        return this.http
            .patch<GroupPersonType>(`${this.url}/groups/${groupId}/people/${personId}`, body)
            .pipe(map((response) => groupPersonSchemaResponse.parse(response)))
    }

    updateGroupPersonOwnership(groupId: number, personId: number, gameId: number, status: 'asserted' | 'rejected' | 'disputed') {
        return this.http
            .put<{ success: true }>(`${this.url}/groups/${groupId}/people/${personId}/ownership`, { gameId, status })
            .pipe(map((response) => successSchema.parse(response)))
    }

    updateGroupPersonPreference(groupId: number, personId: number, gameId: number, preference: 'favorite' | 'like' | 'neutral' | 'avoid') {
        return this.http
            .put<{ success: true }>(`${this.url}/groups/${groupId}/people/${personId}/preferences`, { gameId, preference })
            .pipe(map((response) => successSchema.parse(response)))
    }

    deleteGroupPersonPreference(groupId: number, personId: number, gameId: number) {
        return this.http
            .delete<{ success: true }>(`${this.url}/groups/${groupId}/people/${personId}/preferences/${gameId}`)
            .pipe(map((response) => successSchema.parse(response)))
    }

    addGroupAcquisitionInterest(groupId: number, gameId: number) {
        return this.http
            .post<{ success: true }>(`${this.url}/groups/${groupId}/acquisition-board`, { gameId })
            .pipe(map((response) => successSchema.parse(response)))
    }

    removeGroupAcquisitionInterest(groupId: number, gameId: number) {
        return this.http
            .delete<{ success: true }>(`${this.url}/groups/${groupId}/acquisition-board/${gameId}`)
            .pipe(map((response) => successSchema.parse(response)))
    }

    updateGroupAcquisitionDecision(groupId: number, gameId: number, status: 'open' | 'planned' | 'not_now') {
        return this.http
            .put<{ success: true }>(`${this.url}/groups/${groupId}/acquisition-board/${gameId}/decision`, { status })
            .pipe(map((response) => successSchema.parse(response)))
    }

    leaveGroup(userId: number, groupId: number) {
        return this.http
            .delete<{ success: true }>(`${this.url}/dashboard/users/${userId}/groups/${groupId}/members`, {})
            .pipe(map((response) => successSchema.parse(response)))
    }

    removeMember(userId: number, groupId: number, memberId: number) {
        return this.http
            .delete<{ success: true }>(`${this.url}/dashboard/users/${userId}/groups/${groupId}/members/${memberId}`, {})
            .pipe(map((response) => successSchema.parse(response)))
    }

    // --------------------------------------------------------------------------
    // #region play
    // --------------------------------------------------------------------------
    getUserGamesHistory(userId: number) {
        return this.http
            .get<Array<HistoryRecordType>>(`${this.url}/play/users/${userId}/history`)
            .pipe(map((response) => userHistorySchema.parse(response)))
    }

    getUserMeets(userId: number) {
        return this.http
            .get<Array<MeetType>>(`${this.url}/play/users/${userId}/meets`)
            .pipe(map((response) => userMeetsSchema.parse(response)))
    }

    getRecommendations(body: {
        groupId: number
        attendeeIds: Array<number>
        availableMinutes?: number
        decisionLens?: 'balanced' | 'fresh' | 'favorite'
    }) {
        return this.http
            .post<RecommendationsType>(`${this.url}/play/recommendations`, body)
            .pipe(map((response) => recommendationsSchema.parse(response)))
    }

    getParticipantRecommendations(body: {
        groupId: number
        groupPersonIds: Array<number>
        availableMinutes?: number
        decisionLens?: 'balanced' | 'fresh' | 'favorite'
    }) {
        return this.http
            .post<RecommendationsType>(`${this.url}/play/recommendations/participants`, body)
            .pipe(map((response) => recommendationsSchema.parse(response)))
    }

    createRecommendationFeedback(body: {
        groupId: number
        gameId: number
        attendeeIds: Array<number>
        feedback: 'interested' | 'not_for_us' | 'played'
    }) {
        return this.http
            .post<{ success: true }>(`${this.url}/play/recommendations/feedback`, body)
            .pipe(map((response) => successSchema.parse(response)))
    }

    getRecommendationSignals(groupId: number) {
        return this.http
            .get<RecommendationSignalsType>(`${this.url}/play/recommendations/signals?groupId=${groupId}`)
            .pipe(map((response) => recommendationSignalsSchema.parse(response)))
    }

    // --------------------------------------------------------------------------
    // #region profile
    // --------------------------------------------------------------------------
    getUserById(id: number) {
        return this.http.get<UserType>(`${this.url}/profile/users/${id}`).pipe(map((response) => userSchema.parse(response)))
    }

    getUserNotifications(userId: number) {
        return this.http
            .get<Array<NotificationType>>(`${this.url}/profile/users/${userId}/notifications`)
            .pipe(map((response) => userNotificationsSchema.parse(response)))
    }

    getUserInvitations(userId: number) {
        return this.http
            .get<Array<InvitationWithExtraData>>(`${this.url}/profile/users/${userId}/invitations`)
            .pipe(map((response) => userInvitationsSchema.parse(response)))
    }

    acceptInvitation(userId: number, invitationId: number) {
        return this.http
            .post<{ success: true }>(`${this.url}/profile/users/${userId}/invitations/${invitationId}/accept`, {})
            .pipe(map((response) => successSchema.parse(response)))
    }

    // #region Game Proposals

    createGameProposal(userId: number, proposalData: CreateGameProposalType) {
        return this.http
            .post<GameProposalType>(`${this.url}/profile/users/${userId}/proposals`, proposalData)
            .pipe(map((response) => gameProposalSchema.parse(response)))
    }

    getUserProposals(userId: number) {
        return this.http
            .get<Array<GameProposalType>>(`${this.url}/profile/users/${userId}/proposals`)
            .pipe(map((response) => userProposalsSchema.parse(response)))
    }

    getUserProposalStats(userId: number) {
        return this.http
            .get<UserProposalStatsType>(`${this.url}/profile/users/${userId}/proposal-stats`)
            .pipe(map((response) => userProposalStatsSchema.parse(response)))
    }

    // #endregion

    // #region Admin - Game Proposals

    getAdminGameProposals(status?: 'pending' | 'approved' | 'rejected' | 'duplicate', page = 1, limit = 10) {
        const params = new URLSearchParams()
        if (status) params.append('status', status)
        params.append('page', page.toString())
        params.append('limit', limit.toString())

        return this.http
            .get<{
                proposals: Array<GameProposalType & { submitterId: number; reviewerId?: number }>
                pagination: {
                    currentPage: number
                    totalPages: number
                    totalItems: number
                    itemsPerPage: number
                }
            }>(`${this.url}/admin/proposals?${params.toString()}`)
            .pipe(map((response) => adminGameProposalsSchema.parse(response)))
    }

    getAdminGameProposal(id: number) {
        return this.http
            .get<GameProposalType & { submitterId: number; reviewerId?: number }>(`${this.url}/admin/proposals/${id}`)
            .pipe(map((response) => adminGameProposalSchema.parse(response)))
    }

    approveGameProposal(
        id: number,
        approvalData: {
            reviewNotes?: string
            imageUrl?: string
            gameAvgDuration?: number
            minPlayers?: number
            maxPlayers?: number
            translations?: Record<string, string>
            tagIds?: number[]
        },
    ) {
        return this.http
            .post<{ success: boolean; createdGameId?: number }>(`${this.url}/admin/proposals/${id}/approve`, approvalData)
            .pipe(map((response) => adminApprovalResponseSchema.parse(response)))
    }

    rejectGameProposal(id: number, rejectionData: { reviewNotes: string }) {
        return this.http
            .post<{ success: boolean }>(`${this.url}/admin/proposals/${id}/reject`, rejectionData)
            .pipe(map((response) => adminSuccessResponseSchema.parse(response)))
    }

    markGameProposalAsDuplicate(id: number, reviewNotes?: string) {
        const params = new URLSearchParams()
        if (reviewNotes) params.append('reviewNotes', reviewNotes)

        return this.http
            .post<{ success: boolean }>(`${this.url}/admin/proposals/${id}/duplicate?${params.toString()}`, {})
            .pipe(map((response) => adminSuccessResponseSchema.parse(response)))
    }

    deleteGameProposal(id: number) {
        return this.http
            .delete<{ success: boolean }>(`${this.url}/admin/proposals/${id}`)
            .pipe(map((response) => adminSuccessResponseSchema.parse(response)))
    }

    // #endregion
}
