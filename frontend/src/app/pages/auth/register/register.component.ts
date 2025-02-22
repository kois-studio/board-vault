import { Component, OnInit } from '@angular/core'
import { RouterLink } from '@angular/router'
import { FormRegisterComponent } from './form-register/form-register.component'

@Component({
    templateUrl: 'register.component.html',
    imports: [RouterLink, FormRegisterComponent],
})
export class RegisterComponent implements OnInit {
    ngOnInit() {}
}
