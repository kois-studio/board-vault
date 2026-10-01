import { Component, inject, signal } from '@angular/core'
import type { UserType } from '../../../api/api.types'
import { DataService } from '../../../core/services/data.service'
import { AvatarEditorComponent } from '../../avatar-editor/avatar-editor.component'
import { DialogDirective } from '../../ui/dialog/dialog.directive'
import { IconComponent } from '../../ui/icon/icon.component'

@Component({
    imports: [AvatarEditorComponent, DialogDirective, IconComponent],
    selector: 'app-modal-avatar-editor',
    templateUrl: 'modal-avatar-editor.component.html',
})
export class ModalAvatarEditorComponent {
    private readonly dataService = inject(DataService)

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    public readonly isVisible = signal(false)

    // --------------------------------------------------------------------------
    //        Methods
    // --------------------------------------------------------------------------
    public showDialog() {
        this.isVisible.set(true)
    }

    public hideDialog() {
        this.isVisible.set(false)
    }

    public updateAvatar(newAvatar: UserType['avatar']) {
        // updateCurrentUserData saves the change and reloads the current user.
        this.dataService.updateCurrentUserData({ avatar: newAvatar })
    }
}
