import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { environment } from '../../environments/environment'
import type { GameType } from '../types/game.type'
import type { GroupWithMembersType } from '../types/group-with-members.type'
import type { GroupMemberType, UserType } from '../types/user.type'

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

    getUsers() {
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
        return this.http.get<Array<GroupWithMembersType>>(`${this.url}/users/${userId}/groups`)
    }

    getUserGames(userId: number) {
        return this.http.get<Array<GameType>>(`${this.url}/users/${userId}/games`)
    }

    // #region groups

    getGroupMembers(groupId: number) {
        return this.http.get<Array<GroupMemberType>>(`${this.url}/groups/${groupId}/members`)
    }

    // #region games

    getGames() {
        return this.http.get<Array<GameType>>(`${this.url}/games`)
    }

    // #region invitations

    createInvitation(groupId: number, fromAccountId: number, toUsername: string) {
        return this.http.post<{ success: true }>(`${this.url}/invitations/byUsername`, { groupId, fromAccountId, toUsername })
    }
}
