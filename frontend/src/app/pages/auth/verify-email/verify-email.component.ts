import { Component, OnInit } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { RouterLink } from '@angular/router'
import { Api } from '../../../api/api'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { SpinnerComponent } from '../../../components/ui/spinner/spinner.component'

@Component({
    templateUrl: 'verify-email.component.html',
    imports: [SpinnerComponent, RouterLink, IconComponent],
})
export class VerifyEmailComponent implements OnInit {
    public state: 'loading' | 'success' | 'error' = 'loading'

    constructor(
        private readonly api: Api,
        private readonly route: ActivatedRoute,
    ) {}

    ngOnInit(): void {
        this.verifyEmail()
    }

    public verifyEmail(): void {
        const token = this.route.snapshot.paramMap.get('token')
        if (!token) {
            this.state = 'error'
            return
        }

        this.state = 'loading'
        this.api.verifyEmail(token).subscribe({
            next: () => {
                this.state = 'success'
            },
            error: () => {
                this.state = 'error'
            },
        })
    }
}
