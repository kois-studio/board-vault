import { Component, OnInit } from '@angular/core'
import { RouterLink, RouterOutlet } from '@angular/router'
import { FormLoginComponent } from './form-login/form-login.component'

@Component({
    templateUrl: 'login.component.html',
    imports: [RouterLink, FormLoginComponent],
})
export class LoginComponent implements OnInit {
    ngOnInit() {}
}
