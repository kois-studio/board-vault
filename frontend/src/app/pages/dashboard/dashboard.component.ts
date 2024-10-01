import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-dashboard',
    templateUrl: 'dashboard.component.html',
    standalone: true,
})

export class DashboardComponent implements OnInit {   
    getUsersApi = `${environment.apiUrl}/users`;
    users: any[] = [];

    ngOnInit() {
        this.getUsers();
    }

    getUsers() {
        fetch(this.getUsersApi)
            .then(response => response.json())
            .then(data => {
                this.users = data;
            });
    }
}