import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { environment } from '../../environments/environment'
import type {
    GameOwnedType,
    GameReviewWithGameData,
    GameType,
    GameViewType,
    GroupWithMembersAndGames,
    HistoryRecordType,
    InvitationWithAccountsData,
    InvitationWithExtraData,
    MeetAttendeeType,
    MeetGameType,
    MeetType,
    MeetWithAttendeesAndGamesType,
    NotificationType,
    UpdateGameOwnedType,
    UserType,
} from './api.types'

@Injectable({ providedIn: 'root' })
export class Api {
    private readonly url = environment.apiUrl

    constructor(private readonly http: HttpClient) {}

    // #region auth

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

    getUserMeets(userId: number) {
        return this.http.get<Array<MeetType>>(`${this.url}/users/${userId}/meets`)
    }

    updateUserGames(userId: number, gamesToAdd: Array<number>, gamesToRemove: Array<number>) {
        return this.http.put<{ success: true }>(`${this.url}/users/${userId}/games`, { gamesToAdd, gamesToRemove })
    }

    // #region groups

    getGroupInvitations(groupId: number) {
        return this.http.get<Array<InvitationWithAccountsData>>(`${this.url}/groups/${groupId}/invitations`)
    }

    leaveGroup(accountId: number, groupId: number) {
        return this.http.post<{ success: true }>(`${this.url}/users/${accountId}/group/${groupId}/leave`, {})
    }

    removeMember(groupId: number, memberId: number) {
        return this.http.delete<{ success: true }>(`${this.url}/memberships/${memberId}/${groupId}`, {})
    }

    getGroupMeetings(groupId: number) {
        return this.http.get<Array<MeetWithAttendeesAndGamesType>>(`${this.url}/groups/${groupId}/meetings`)
    }

    // #region games

    getGames() {
        return this.http.get<Array<GameType>>(`${this.url}/games`)
    }

    // #region invitations

    deleteInvitation(invitationId: number) {
        return this.http.delete<{ success: true }>(`${this.url}/invitations/${invitationId}`)
    }

    createInvitation(groupId: number, fromAccountId: number, username: string) {
        return this.http.post<UserType>(`${this.url}/invitations/byUsername`, { groupId, fromAccountId, username })
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

    // #region game reviews

    saveGameReview(accountId: number, gameId: number, review: number) {
        return this.http.post<{ success: true }>(`${this.url}/reviews/`, { accountId, gameId, review })
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

    confimMeeting(meetId: number) {
        return this.http.post<{ success: true }>(`${this.url}/meets/${meetId}/confirm`, {})
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

    // #region wishlist

    getWishlist(accountId: number) {
        return this.http.get<Array<{ isWishlisted: boolean }>>(`${this.url}/wishlist/${accountId}`)
    }

    toggleWishlist(accountId: number, gameId: number) {
        return this.http.put<{ isWishlisted: boolean }>(`${this.url}/wishlist/${accountId}/${gameId}`, {})
    }

    // --------------------------------------------------------------------------
    // #region collection
    // --------------------------------------------------------------------------
    getUserGames(userId: number) {
        return this.http.get<Array<GameType>>(`${this.url}/collection/users/${userId}/games`)
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

    getUserReviews(userId: number) {
        return this.http.get<Array<GameReviewWithGameData>>(`${this.url}/collection/users/${userId}/reviews`)
    }

    // --------------------------------------------------------------------------
    // #region dashboard
    // --------------------------------------------------------------------------
    getUserGroups(userId: number) {
        return this.http.get<Array<GroupWithMembersAndGames>>(`${this.url}/dashboard/users/${userId}/groups`)
    }

    createGroup(userId: number, groupName: string) {
        return this.http.post<{ success: true }>(`${this.url}/dashboard/users/${userId}/groups/create/${groupName}`, {})
    }

    deleteGroup(userId: number, groupId: number) {
        return this.http.delete<{ success: true }>(`${this.url}/dashboard/users/${userId}/groups/${groupId}/delete`, {})
    }

    // --------------------------------------------------------------------------
    // #region play
    // --------------------------------------------------------------------------
    getUserGamesHistory(userId: number) {
        return this.http.get<Array<HistoryRecordType>>(`${this.url}/play/users/${userId}/history`)
    }

    // --------------------------------------------------------------------------
    // #region profile
    // --------------------------------------------------------------------------
    getUserByEmail(email: string) {
        return this.http.get<UserType>(`${this.url}/profile/users/byEmail/${email}`)
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
}
