import { Component, OnInit } from '@angular/core'
import { Api } from '../../api/api'

@Component({
    selector: 'app-dashboard',
    templateUrl: 'dashboard.component.html',
    standalone: true,
})
export class DashboardComponent implements OnInit {
    public users: any[] = []

    constructor(private readonly api: Api) {}

    ngOnInit() {
        this.getUsers()
    }

    getUsers() {
        this.api.getUsers().subscribe({
            next: (data: any) => {
                this.users = data
            },
            error: (error) => {
                console.error('error', error)
            },
        })
    }
}
