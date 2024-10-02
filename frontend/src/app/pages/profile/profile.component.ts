import { Component, OnInit } from '@angular/core'
import { Api } from '../../api/api'
import { ToastService } from '../../components/toast/toast.service'

@Component({
    standalone: true,
    imports: [],
    selector: 'app-profile',
    templateUrl: 'profile.component.html',
})
export class ProfileComponent implements OnInit {
    public isVisible = false
    public tabView = 1 // manages which tab is active

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
