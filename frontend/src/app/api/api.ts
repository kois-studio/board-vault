import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { environment } from '../../environments/environment'
import type { GameType, GroupWithMembersAndGames, InvitationType, InvitationWithAccountsData, UserType } from './api.types'

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

    private getUsers() {
        return this.http.get<Array<UserType>>(`${this.url}/users`)
    }

    getUserByEmail(email: string) {
        return this.http.get<UserType>(`${this.url}/users/byEmail/${email}`)
    }

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

    getUserGroups(userId: number) {
        return this.http.get<Array<number>>(`${this.url}/users/${userId}/groups`)
    }

    getUserGames(userId: number) {
        return this.http.get<Array<GameType>>(`${this.url}/users/${userId}/games`)
    }

    updateUserGames(userId: number, gamesToAdd: Array<number>, gamesToRemove: Array<number>) {
        return this.http.put<{ success: true }>(`${this.url}/users/${userId}/games`, { gamesToAdd, gamesToRemove })
    }

    // #region groups

    getGroupInvitations(groupId: number) {
        return this.http.get<Array<InvitationWithAccountsData>>(`${this.url}/groups/${groupId}/invitations`)
    }

    getGroupWithMembersAndGames(groupId: number) {
        return this.http.get<GroupWithMembersAndGames>(`${this.url}/groups/${groupId}/withMembersAndGames`)
    }

    // #region games

    getGames() {
        return this.http.get<Array<GameType>>(`${this.url}/games`)
    }

    // #region invitations

    getInvitationsReceived(accountId: number) {
        return this.http.get<Array<InvitationType>>(`${this.url}/users/${accountId}/invitationsReceived`)
    }

    createInvitation(groupId: number, fromAccountId: number, username: string) {
        return this.http.post<UserType>(`${this.url}/invitations/byUsername`, { groupId, fromAccountId, username })
    }

    deletInvitation(invitationId: number) {
        return this.http.delete<{ success: true }>(`${this.url}/invitations/${invitationId}`)
    }
}
