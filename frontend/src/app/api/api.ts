import { HttpClient, HttpHeaders } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { environment } from '../../environments/environment'
import type {
    AdminGamesResultType,
    BrowseGamesResultType,
    CollectionActivityWithGameDataType,
    CreateGameProposalType,
    GameCompleteType,
    GameOwnedType,
    GameProposalType,
    GameReviewWithGameData,
    GameType,
    GameViewType,
    GameWithTagsAndTranslationsType,
    GroupWithMembersAndGames,
    HistoryRecordType,
    InvitationWithAccountsData,
    InvitationWithExtraData,
    MeetAttendeeType,
    MeetGameType,
    MeetType,
    MeetWithAttendeesAndGamesType,
    NotificationType,
    TagCategoryType,
    TagType,
    UpdateGameOwnedType,
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
        return this.http.get<{ isValid: true; userId: number; isAdmin: boolean }>(`${this.url}/auth/status`)
    }

    clerkAuthStatus(accessToken: string) {
        return this.http.get<{
            isValid: true
            userId: number
            isAdmin: boolean
            clerkUserId: string
        }>(`${this.url}/auth/clerk/status`, {
            headers: new HttpHeaders({ Authorization: `Bearer ${accessToken}` }),
        })
    }

    login(email: string, password: string) {
        return this.http.post<{ access_token: string }>(`${this.url}/auth/login`, { email, password })
    }

    register(email: string, username: string, password: string) {
        return this.http.post<{ success: true }>(`${this.url}/auth/register`, { email, username, password })
    }

    checkEmail(email: string) {
        return this.http.get<{ isAvailable: boolean }>(`${this.url}/auth/check-email?email=${email}`)
    }

    checkUsername(username: string) {
        return this.http.get<{ isAvailable: boolean }>(`${this.url}/auth/check-username?username=${username}`)
    }

    verifyEmail(token: string) {
        return this.http.get<{ success: true }>(`${this.url}/auth/verify-email/${token}`)
    }

    forgotPassword(email: string) {
        return this.http.post<{ success: true }>(`${this.url}/auth/forgot-password`, { email })
    }

    resetPassword(token: string, password: string) {
        return this.http.post<{ success: true }>(`${this.url}/auth/reset-password/${token}`, { password })
    }

    // #region users

    updateUser(
        userId: number,
        requesBody: {
            email?: string
            password?: string
            username?: string
            displayName?: string
            avatar?: UserType['avatar']
        },
    ) {
        return this.http.put<{ success: true }>(`${this.url}/users/${userId}`, requesBody)
    }

    updateUserGames(userId: number, gamesToAdd: Array<number>, gamesToRemove: Array<number>) {
        return this.http.put<{ success: true }>(`${this.url}/users/${userId}/games`, { gamesToAdd, gamesToRemove })
    }

    // #region groups

    getGroupInvitations(groupId: number) {
        return this.http.get<Array<InvitationWithAccountsData>>(`${this.url}/groups/${groupId}/invitations`)
    }

    // #region games

    getGames() {
        return this.http.get<Array<GameType>>(`${this.url}/games`)
    }

    // #region invitations

    deleteInvitation(invitationId: number) {
        return this.http.delete<{ success: true }>(`${this.url}/invitations/${invitationId}`)
    }

    createInvitation(groupId: number, username: string) {
        return this.http.post<UserType>(`${this.url}/invitations/byUsername`, { groupId, username })
    }

    // #region notifications

    deleteNotification(notificationId: number) {
        return this.http.delete<{ success: true }>(`${this.url}/notifications/${notificationId}`)
    }

    updateNotification(notificationId: number, partialNotification: Partial<NotificationType>) {
        return this.http.put<{ success: true }>(`${this.url}/notifications/${notificationId}`, {
            isRead: partialNotification.isRead,
        })
    }

    // #region meetings

    createMeeting(accountId: number, groupId: number) {
        return this.http.post<{ success: true; meetId: number }>(`${this.url}/users/${accountId}/group/${groupId}/newMeeting`, {
            accountId,
            groupId,
        })
    }

    getMeetById(meetId: number) {
        return this.http.get<MeetType>(`${this.url}/meets/${meetId}`)
    }

    getMeetDetailsById(meetId: number) {
        return this.http.get<MeetWithAttendeesAndGamesType>(`${this.url}/meets/${meetId}/details`)
    }

    // #region meet attendees

    createMeetAttendee(meetId: number, accountId: number) {
        return this.http.post<MeetAttendeeType>(`${this.url}/meetAttendees/${meetId}/${accountId}`, {})
    }

    deleteMeetAttendee(meetId: number, accountId: number) {
        return this.http.delete<{ success: true }>(`${this.url}/meetAttendees/${meetId}/${accountId}`)
    }

    // #region meet games

    createMeetAccountGame(accountId: number, meetId: number, gameId: number) {
        return this.http.post<MeetGameType>(`${this.url}/meetAccountGames/${accountId}/${meetId}/${gameId}`, {})
    }

    deleteMeetAccountGame(accountId: number, meetId: number, gameId: number) {
        return this.http.delete<{ success: true }>(`${this.url}/meetAccountGames/${accountId}/${meetId}/${gameId}`)
    }

    // --------------------------------------------------------------------------
    // #region admin
    // --------------------------------------------------------------------------
    getAdminTagCategories() {
        return this.http.get<Array<TagCategoryType>>(`${this.url}/admin/tag-categories`)
    }

    createAdminTagCategory(name: string) {
        return this.http.post<TagCategoryType>(`${this.url}/admin/tag-categories`, { name })
    }

    updateAdminTagCategory(id: number, name: string) {
        return this.http.put<TagCategoryType>(`${this.url}/admin/tag-categories/${id}`, { name })
    }

    deleteAdminTagCategory(id: number) {
        return this.http.delete<{ success: true }>(`${this.url}/admin/tag-categories/${id}`)
    }

    getAdminTags() {
        return this.http.get<Array<TagType>>(`${this.url}/admin/tags`)
    }

    createAdminTag(payload: { name: string; categoryId: number }) {
        return this.http.post<TagType>(`${this.url}/admin/tags`, payload)
    }

    updateAdminTag(id: number, payload: { name: string; categoryId: number }) {
        return this.http.put<TagType>(`${this.url}/admin/tags/${id}`, payload)
    }

    deleteAdminTag(id: number) {
        return this.http.delete<{ success: true }>(`${this.url}/admin/tags/${id}`)
    }

    // #region Admin Games

    getAdminGames(search = '', page = 1, limit = 10) {
        const params = new URLSearchParams()
        if (search) params.append('search', search)
        params.append('page', page.toString())
        params.append('limit', limit.toString())

        return this.http.get<AdminGamesResultType>(`${this.url}/admin/games?${params.toString()}`)
    }

    updateAdminGameTranslations(gameId: number, translations: Record<string, string>) {
        return this.http.put<{ success: true }>(`${this.url}/admin/games/${gameId}/translations`, translations)
    }

    updateAdminGameTags(gameId: number, tagIds: number[]) {
        return this.http.put<{ success: true }>(`${this.url}/admin/games/${gameId}/tags`, { tagIds })
    }

    // #endregion

    // --------------------------------------------------------------------------
    // #region collection
    // --------------------------------------------------------------------------
    getUserGames(userId: number) {
        return this.http.get<Array<GameCompleteType>>(`${this.url}/collection/users/${userId}/games`)
    }

    browseGamesNotOwnedByUser(userId: number, search: string, page: number, limit: number) {
        return this.http.get<BrowseGamesResultType>(
            `${this.url}/collection/users/${userId}/browse/games?search=${search}&page=${page}&limit=${limit}`,
        )
    }

    getGameView(userId: number, gameId: number) {
        return this.http.get<GameViewType>(`${this.url}/collection/users/${userId}/games/${gameId}`)
    }

    addGameToUserCollection(userId: number, gameId: number) {
        return this.http.post<{ success: true }>(`${this.url}/collection/users/${userId}/games/${gameId}`, {})
    }

    removeGameFromUserCollection(userId: number, gameId: number) {
        return this.http.delete<{ success: true }>(`${this.url}/collection/users/${userId}/games/${gameId}`)
    }

    patchGameOwnership(userId: number, gameId: number, ownedGameDto: UpdateGameOwnedType) {
        return this.http.patch<GameOwnedType>(`${this.url}/collection/users/${userId}/games/${gameId}/ownership`, ownedGameDto)
    }

    toggleWishlist(userId: number, gameId: number) {
        return this.http.put<{ isWishlisted: boolean }>(`${this.url}/collection/users/${userId}/games/${gameId}/wishlist`, {})
    }

    getUserReviews(userId: number) {
        return this.http.get<Array<GameReviewWithGameData>>(`${this.url}/collection/users/${userId}/reviews`)
    }

    saveGameReview(userId: number, gameId: number, review: number) {
        return this.http.post<{ success: true }>(`${this.url}/collection/users/${userId}/reviews/${gameId}`, { review })
    }

    getUserWishlist(userId: number) {
        return this.http.get<Array<GameCompleteType>>(`${this.url}/collection/users/${userId}/wishlist`)
    }

    getUserCollectionActivity(userId: number) {
        return this.http.get<Array<CollectionActivityWithGameDataType>>(`${this.url}/collection/users/${userId}/recent-activity`)
    }

    // --------------------------------------------------------------------------
    // #region dashboard
    // --------------------------------------------------------------------------
    getUserStats(userId: number) {
        return this.http.get<UserStatsType>(`${this.url}/dashboard/users/${userId}/stats`)
    }

    getUserGroups(userId: number) {
        return this.http.get<Array<GroupWithMembersAndGames>>(`${this.url}/dashboard/users/${userId}/groups`)
    }

    createGroup(userId: number, groupName: string) {
        return this.http.post<{ success: true }>(`${this.url}/dashboard/users/${userId}/groups/create/${groupName}`, {})
    }

    deleteGroup(userId: number, groupId: number) {
        return this.http.delete<{ success: true }>(`${this.url}/dashboard/users/${userId}/groups/${groupId}`, {})
    }

    getGroupMeetings(userId: number, groupId: number) {
        return this.http.get<Array<HistoryRecordType>>(`${this.url}/dashboard/users/${userId}/groups/${groupId}/meetings`)
    }

    createGroupMeeting(userId: number, groupId: number) {
        return this.http.post<{ success: true }>(`${this.url}/dashboard/users/${userId}/groups/${groupId}/meetings`, {})
    }

    leaveGroup(userId: number, groupId: number) {
        return this.http.delete<{ success: true }>(`${this.url}/dashboard/users/${userId}/groups/${groupId}/members`, {})
    }

    removeMember(userId: number, groupId: number, memberId: number) {
        return this.http.delete<{ success: true }>(`${this.url}/dashboard/users/${userId}/groups/${groupId}/members/${memberId}`, {})
    }

    // --------------------------------------------------------------------------
    // #region play
    // --------------------------------------------------------------------------
    getUserGamesHistory(userId: number) {
        return this.http.get<Array<HistoryRecordType>>(`${this.url}/play/users/${userId}/history`)
    }

    getUserMeets(userId: number) {
        return this.http.get<Array<MeetType>>(`${this.url}/play/users/${userId}/meets`)
    }

    // --------------------------------------------------------------------------
    // #region profile
    // --------------------------------------------------------------------------
    getUserById(id: number) {
        return this.http.get<UserType>(`${this.url}/profile/users/${id}`)
    }

    getUserNotifications(userId: number) {
        return this.http.get<Array<NotificationType>>(`${this.url}/profile/users/${userId}/notifications`)
    }

    getUserInvitations(userId: number) {
        return this.http.get<Array<InvitationWithExtraData>>(`${this.url}/profile/users/${userId}/invitations`)
    }

    acceptInvitation(userId: number, invitationId: number) {
        return this.http.post<{ success: true }>(`${this.url}/profile/users/${userId}/invitations/${invitationId}/accept`, {})
    }

    // #region Game Proposals

    createGameProposal(userId: number, proposalData: CreateGameProposalType) {
        return this.http.post<GameProposalType>(`${this.url}/profile/users/${userId}/proposals`, proposalData)
    }

    getUserProposals(userId: number) {
        return this.http.get<Array<GameProposalType>>(`${this.url}/profile/users/${userId}/proposals`)
    }

    getUserProposalStats(userId: number) {
        return this.http.get<UserProposalStatsType>(`${this.url}/profile/users/${userId}/proposal-stats`)
    }

    // #endregion

    // #region Admin - Game Proposals

    getAdminGameProposals(status?: 'pending' | 'approved' | 'rejected' | 'duplicate', page = 1, limit = 10) {
        const params = new URLSearchParams()
        if (status) params.append('status', status)
        params.append('page', page.toString())
        params.append('limit', limit.toString())

        return this.http.get<{
            proposals: Array<GameProposalType & { submitterId: number; reviewerId?: number }>
            pagination: {
                currentPage: number
                totalPages: number
                totalItems: number
                itemsPerPage: number
            }
        }>(`${this.url}/admin/proposals?${params.toString()}`)
    }

    getAdminGameProposal(id: number) {
        return this.http.get<GameProposalType & { submitterId: number; reviewerId?: number }>(`${this.url}/admin/proposals/${id}`)
    }

    approveGameProposal(
        id: number,
        reviewerId: number,
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
        const params = new URLSearchParams()
        params.append('reviewerId', reviewerId.toString())

        return this.http.post<{ success: boolean; createdGameId?: number }>(
            `${this.url}/admin/proposals/${id}/approve?${params.toString()}`,
            approvalData,
        )
    }

    rejectGameProposal(id: number, reviewerId: number, rejectionData: { reviewNotes: string }) {
        const params = new URLSearchParams()
        params.append('reviewerId', reviewerId.toString())

        return this.http.post<{ success: boolean }>(`${this.url}/admin/proposals/${id}/reject?${params.toString()}`, rejectionData)
    }

    markGameProposalAsDuplicate(id: number, reviewerId: number, reviewNotes?: string) {
        const params = new URLSearchParams()
        params.append('reviewerId', reviewerId.toString())
        if (reviewNotes) params.append('reviewNotes', reviewNotes)

        return this.http.post<{ success: boolean }>(`${this.url}/admin/proposals/${id}/duplicate?${params.toString()}`, {})
    }

    deleteGameProposal(id: number) {
        return this.http.delete<{ success: boolean }>(`${this.url}/admin/proposals/${id}`)
    }

    // #endregion
}
