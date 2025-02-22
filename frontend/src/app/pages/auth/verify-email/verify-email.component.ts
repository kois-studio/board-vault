import { Component, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Api } from '../../../api/api'
import { SpinnerComponent } from '../../../components/ui/spinner/spinner.component'

@Component({
    templateUrl: 'verify-email.component.html',
    imports: [SpinnerComponent],
})
export class VerifyEmailComponent implements OnInit {
    public state: 'loading' | 'success' | 'error' = 'loading'

    constructor(
        private readonly api: Api,
        private readonly router: Router,
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

        // set timeout to 2 seconds to show loading state
        // this gives the user time to read the messages without taking too long
        setTimeout(() => {
            this.api.verifyEmail(token).subscribe({
                next: (response) => {
                    this.state = 'success'
                    setTimeout(() => {
                        this.router.navigate(['/login'])
                    }, 2000)
                },
                error: (error) => {
                    this.state = 'error'
                },
            })
        }, 2000)
    }
}
