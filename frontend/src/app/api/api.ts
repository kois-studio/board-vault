import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { environment } from '../../environments/environment'
import { UserType } from '../types/user.type'

@Injectable({ providedIn: 'root' })
export class Api {
    private readonly url = environment.apiUrl

    constructor(private readonly http: HttpClient) {}

    login(email: string, password: string) {
        return this.http.post<{ access_token: string }>(`${this.url}/auth/login`, { email, password })
    }

    register(email: string, username: string, password: string) {
        return this.http.post<{ success: true }>(`${this.url}/auth/register`, { email, username, password })
    }

    getUsers() {
        return this.http.get<Array<UserType>>(`${this.url}/users`)
    }

    getUserByEmail(email: string) {
        return this.http.get<UserType>(`${this.url}/users/byEmail/${email}`)
    }
}
