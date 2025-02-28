import { Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { FormLoginComponent } from './form-login/form-login.component'

@Component({
    templateUrl: 'login.component.html',
    imports: [RouterLink, FormLoginComponent],
})
export class LoginComponent {}
