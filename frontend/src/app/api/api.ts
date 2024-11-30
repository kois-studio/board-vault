import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { environment } from '../../environments/environment'
import type {
    GameReviewType,
    GameType,
    GroupWithMembersAndGames,
    InvitationWithAccountsData,
    InvitationWithExtraData,
    MeetAttendeeType,
    MeetGameType,
    MeetType,
    NotificationType,
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

    // #region users

    updateUser(
        userId: number,
        requesBody: {
            email?: string
            password?: string
            username?: string
            display_name?: string
            imageUrl?: string
        },
    ) {
        return this.http.put<{ success: true }>(`${this.url}/users/${userId}`, requesBody)
    }

    getUserByEmail(email: string) {
        return this.http.get<UserType>(`${this.url}/users/byEmail/${email}`)
    }

    getUserGroups(userId: number) {
        return this.http.get<Array<number>>(`${this.url}/users/${userId}/groups`)
    }

    getUserGames(userId: number) {
        return this.http.get<Array<GameType>>(`${this.url}/users/${userId}/games`)
    }

    getUserReviews(userId: number) {
        return this.http.get<Array<GameReviewType>>(`${this.url}/users/${userId}/reviews`)
    }

    getUserMeets(userId: number) {
        return this.http.get<Array<MeetType>>(`${this.url}/users/${userId}/meets`)
    }

    updateUserGames(userId: number, gamesToAdd: Array<number>, gamesToRemove: Array<number>) {
        return this.http.put<{ success: true }>(`${this.url}/users/${userId}/games`, { gamesToAdd, gamesToRemove })
    }

    getInvitationsReceived(accountId: number) {
        return this.http.get<Array<InvitationWithExtraData>>(`${this.url}/users/${accountId}/invitationsReceived`)
    }

    getUserNotifications(accountId: number) {
        return this.http.get<Array<NotificationType>>(`${this.url}/users/${accountId}/notifications`)
    }

    // #region groups

    getGroupInvitations(groupId: number) {
        return this.http.get<Array<InvitationWithAccountsData>>(`${this.url}/groups/${groupId}/invitations`)
    }

    getGroupWithMembersAndGames(groupId: number) {
        return this.http.get<GroupWithMembersAndGames>(`${this.url}/groups/${groupId}/withMembersAndGames`)
    }

    leaveGroup(accountId: number, groupId: number) {
        return this.http.post<{ success: true }>(`${this.url}/users/${accountId}/group/${groupId}/leave`, {})
    }

    deleteGroup(accountId: number, groupId: number) {
        return this.http.delete<{ success: true }>(`${this.url}/users/${accountId}/group/${groupId}/delete`, {})
    }

    createGroup(accountId: number, groupName: string) {
        return this.http.post<{ success: true }>(`${this.url}/users/${accountId}/group/create/${groupName}`, {})
    }

    removeMember(groupId: number, memberId: number) {
        return this.http.delete<{ success: true }>(`${this.url}/memberships/${memberId}/${groupId}`, {})
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

    acceptInvitation(invitationId: number) {
        return this.http.post<{ success: true }>(`${this.url}/invitations/${invitationId}/accept`, {})
    }

    // #region notifications

    deleteNotification(notificationId: number) {
        return this.http.delete<{ success: true }>(`${this.url}/notifications/${notificationId}`)
    }

    updateNotification(notificationId: number, partialNotification: Partial<NotificationType>) {
        return this.http.put<{ success: true }>(`${this.url}/notifications/${notificationId}`, { isRead: partialNotification.isRead })
    }

    // #region Game Reviews

    createGameReview(accountId: number, gameId: number, review: number) {
        return this.http.post<{ success: true }>(`${this.url}/reviews/`, { accountId, gameId, review })
    }

    deleteGameReview(accountId: number, gameId: number) {
        return this.http.delete<{ success: true }>(`${this.url}/reviews/${accountId}/${gameId}`)
    }

    // #region Meetings

    createMeeting(accountId: number, groupId: number) {
        return this.http.post<{ success: true; meetId: number }>(`${this.url}/users/${accountId}/group/${groupId}/newMeeting`, {
            accountId,
            groupId,
        })
    }

    getMeetById(meetId: number) {
        return this.http.get<MeetType>(`${this.url}/meets/${meetId}`)
    }

    getMeetAttendees(meetId: number) {
        return this.http.get<Array<MeetAttendeeType>>(`${this.url}/meetAttendees/${meetId}`)
    }

    updateMeetAttendee(meetId: number, accountId: number, isAttending: boolean) {
        return this.http.put<{ success: true }>(`${this.url}/meetAttendees/${meetId}/${accountId}`, { isAttending })
    }

    getMeetGames(meetId: number) {
        return this.http.get<Array<MeetGameType>>(`${this.url}/meetGames/${meetId}`)
    }

    updateMeetGame(meetId: number, gameId: number, isPlayed: boolean) {
        return this.http.put<{ success: true }>(`${this.url}/meetGames/${meetId}/${gameId}`, { isPlayed })
    }
}
