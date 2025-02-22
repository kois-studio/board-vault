import { Component, OnInit } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { Api } from '../../../api/api'

@Component({
    templateUrl: 'verify-email.component.html',
    imports: [],
})
export class VerifyEmailComponent implements OnInit {
    public state: 'loading' | 'success' | 'error' = 'loading'

    constructor(
        private readonly api: Api,
        private readonly route: ActivatedRoute,
    ) {}

    ngOnInit() {
        this._verifyEmail()
    }
    private _verifyEmail() {
        const token = this.route.snapshot.paramMap.get('token')
        if (!token) {
            this.state = 'error'
            return
        }

        setTimeout(() => {
            this.api.verifyEmail(token).subscribe({
                next: (response) => {
                    this.state = 'success'
                },
                error: (error) => {
                    this.state = 'error'
                },
            })
        }, 2000);
    }
}
