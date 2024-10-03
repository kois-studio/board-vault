import { Component, OnInit } from '@angular/core'
import { Api } from '../../api/api'
import { ToastService } from '../toast/toast.service'

@Component({
    standalone: true,
    imports: [],
    selector: 'app-profile-settings',
    templateUrl: 'profile-settings.component.html',
})
export class ProfileSettingsComponent implements OnInit {
    public isVisible = false
    public tabView = 0 // manages which tab is active

    constructor(
        private readonly api: Api,
        private readonly toastService: ToastService,
    ) {}

    ngOnInit() {
        this.api.getUserByEmail('dasdadasdasda').subscribe({
            next: (data: any) => {
                // this.user = data
            },
            error: (error) => {
                this.toastService.error("Error retrieving user's data")
            },
        })
    }

    public showDialog() {
        this.isVisible = true
    }

    public hideDialog() {
        this.isVisible = false
    }
}
