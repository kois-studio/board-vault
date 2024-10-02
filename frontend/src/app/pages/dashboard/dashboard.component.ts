import { Component, OnInit } from '@angular/core'
import { environment } from '../../../environments/environment'
import { HttpClient } from '@angular/common/http'

@Component({
    selector: 'app-dashboard',
    templateUrl: 'dashboard.component.html',
    standalone: true,
})
export class DashboardComponent implements OnInit {
    public users: any[] = []

    constructor(private readonly http: HttpClient) {}

    ngOnInit() {
        this.getUsers()
    }

    getUsers() {
        const url = `${environment.apiUrl}/users`
        this.http.get(url).subscribe({
            next: (data: any) => {
                this.users = data
            },
            error: (error) => {
                console.error('error', error)
            },
        })
    }
}
