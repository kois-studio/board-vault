import { Component, inject, ViewChild } from '@angular/core'
import { FormUpdateDisplayNameComponent } from '../../../components/forms/form-update-display-name/form-update-display-name.component'
import { FormUpdateUsernameComponent } from '../../../components/forms/form-update-username/form-update-username.component'
import { ImageProfileComponent } from '../../../components/image-profile/image-profile.component'
import { ModalAvatarEditorComponent } from '../../../components/modals/modal-avatar-editor/modal-avatar-editor.component'
import { DataService } from '../../../core/services/data.service'

@Component({
    imports: [FormUpdateDisplayNameComponent, FormUpdateUsernameComponent, ImageProfileComponent, ModalAvatarEditorComponent],
    templateUrl: './settings-account.component.html',
})
export class SettingsAccountComponent {
    private readonly dataService = inject(DataService)

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService

    public readonly currentUser$ = this.dataService.currentUser

    // --------------------------------------------------------------------------
    //        Child components
    // --------------------------------------------------------------------------
    @ViewChild(ModalAvatarEditorComponent) modalAvatarEditorComponent!: ModalAvatarEditorComponent

    // --------------------------------------------------------------------------
    //        Methods
    // --------------------------------------------------------------------------
    public showAvatarEditor() {
        this.modalAvatarEditorComponent.showDialog()
    }
}
