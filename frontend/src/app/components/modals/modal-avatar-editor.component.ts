import { Component, inject } from '@angular/core'
import { Api } from '../../api/api'
import type { UserType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { AvatarEditorComponent } from '../avatar-editor/avatar-editor.component'

@Component({
    imports: [AvatarEditorComponent],
    selector: 'app-modal-avatar-editor',
    templateUrl: 'modal-avatar-editor.component.html',
})
export class ModalAvatarEditorComponent {
    private readonly api = inject(Api)
    private readonly dataService = inject(DataService)

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    public isVisible = false
    public userAvatar: UserType['imageUrl'] = {
        backgroundColor: '#3B82F6',
        iconName: 'person-fill',
        emoji: null,
        type: 'icon',
        initials: '',
    }

    // --------------------------------------------------------------------------
    //        Methods
    // --------------------------------------------------------------------------
    public showDialog() {
        this.isVisible = true
    }

    public hideDialog() {
        this.isVisible = false
    }

    public updateAvatar(newAvatar: UserType['imageUrl']) {
        if (!this.currentUser$()) {
            return
        }

        this.api
            .updateUser(Number(this.currentUser$()?.id), {
                imageUrl: newAvatar,
            })
            .subscribe({
                next: () => {
                    this.dataService.updateCurrentUserData({ imageUrl: newAvatar })
                },
            })
    }
}
