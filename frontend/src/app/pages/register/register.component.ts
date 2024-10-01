import { Component, OnInit } from '@angular/core'
import { RouterLink } from '@angular/router'
import { FormRegisterComponent } from '../../forms/form-register/form-register.component'

@Component({
    selector: 'app-register',
    templateUrl: 'register.component.html',
    standalone: true,
    imports: [RouterLink, FormRegisterComponent],
})
export class RegisterComponent implements OnInit {
    ngOnInit() {}
}
