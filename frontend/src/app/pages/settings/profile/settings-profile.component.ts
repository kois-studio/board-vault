import { Component, inject, ViewChild } from '@angular/core'
import { RouterLink } from '@angular/router'
import { FormUpdateDisplayNameComponent } from '../../../components/forms/form-update-display-name/form-update-display-name.component'
import { ImageProfileComponent } from '../../../components/image-profile/image-profile.component'
import { ModalAvatarEditorComponent } from '../../../components/modals/modal-avatar-editor/modal-avatar-editor.component'
import { DataService } from '../../../core/services/data.service'

/**
 * How people in your groups see you. Board Vault owns the avatar and the
 * display name; the username belongs to Clerk and is changed in Account (ADR-0017).
 */
@Component({
    imports: [FormUpdateDisplayNameComponent, ImageProfileComponent, ModalAvatarEditorComponent, RouterLink],
    templateUrl: './settings-profile.component.html',
})
export class SettingsProfileComponent {
    private readonly dataService = inject(DataService)

    public readonly currentUser$ = this.dataService.currentUser

    @ViewChild(ModalAvatarEditorComponent) modalAvatarEditorComponent!: ModalAvatarEditorComponent

    public showAvatarEditor() {
        this.modalAvatarEditorComponent.showDialog()
    }
}
