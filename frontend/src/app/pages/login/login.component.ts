import { Component, OnInit } from '@angular/core'
import { FormLoginComponent } from '../../forms/form-login/form-login.component'
import { RouterLink, RouterOutlet } from '@angular/router'

@Component({
    selector: 'app-login',
    templateUrl: 'login.component.html',
    standalone: true,
    imports: [RouterLink, FormLoginComponent],
})
export class LoginComponent implements OnInit {
    ngOnInit() {}
}
