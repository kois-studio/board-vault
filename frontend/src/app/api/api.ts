import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { environment } from '../../environments/environment'
import { ResponseGetUser, ResponseGetUsers } from './api.types'

@Injectable({ providedIn: 'root' })
export class Api {
    private readonly url = environment.apiUrl

    constructor(private readonly http: HttpClient) {}

    login(email: string, password: string) {
        return this.http.post<{ access_token: string }>(`${this.url}/auth/login`, { email, password })
    }

    // TODO: type me
    register(email: string, alias: string, password: string) {
        return this.http.post(`${this.url}/auth/register`, { email, alias, password })
    }

    getUsers() {
        return this.http.get<ResponseGetUsers>(`${this.url}/users`)
    }

    getUserByEmail(email: string) {
        return this.http.get<ResponseGetUser>(`${this.url}/users/byEmail/${email}`)
    }
}
