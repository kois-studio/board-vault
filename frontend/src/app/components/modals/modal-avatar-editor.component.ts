import { Component } from '@angular/core'
import { AvatarConfig, AvatarEditorComponent } from '../avatar-editor/avatar-editor.component'

@Component({
    imports: [AvatarEditorComponent],
    selector: 'app-modal-avatar-editor',
    templateUrl: 'modal-avatar-editor.component.html',
})
export class ModalAvatarEditorComponent {
    public isVisible = false

    public showDialog() {
        this.isVisible = true
    }

    public hideDialog() {
        this.isVisible = false
    }

    // TODO: review
    userAvatar: AvatarConfig = {
        backgroundColor: '#3B82F6',
        iconName: 'person-fill',
        emoji: null,
        type: 'icon'
    };
    
    updateAvatar(newConfig: AvatarConfig) {
        this.userAvatar = newConfig
        console.log('newConfig', newConfig)
        // Save to your service/API as needed
    }
}
