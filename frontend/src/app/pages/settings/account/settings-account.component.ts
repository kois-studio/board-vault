import { Component } from '@angular/core'
import { FormUpdateDisplayNameComponent } from "../../../components/forms/form-update-display-name/form-update-display-name.component";
import { FormUpdateUsernameComponent } from '../../../components/forms/form-update-username/form-update-username.component';

@Component({
    imports: [FormUpdateDisplayNameComponent, FormUpdateUsernameComponent],
    templateUrl: './settings-account.component.html',
})
export class SettingsAccountComponent {}
