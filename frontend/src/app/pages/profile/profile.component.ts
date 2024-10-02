import { Component } from '@angular/core'

@Component({
    standalone: true,
    imports: [],
    selector: 'app-profile',
    templateUrl: 'profile.component.html',
})
export class ProfileComponent {
    public isVisible = false

    public showDialog() {
        this.isVisible = true
    }

    public hideDialog() {
        this.isVisible = false
    }
}
