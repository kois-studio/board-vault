import { afterNextRender, Component, computed, DestroyRef, ElementRef, Injector, inject, signal, viewChild } from '@angular/core'
import type { UserType } from '../../../api/api.types'
import { DataService } from '../../../core/services/data.service'
import { isSaveOutcomeUnknown } from '../../../core/utils/apiUnavailable'
import { AvatarEditorComponent } from '../../avatar-editor/avatar-editor.component'
import { ButtonComponent } from '../../ui/button/button.component'
import { DialogDirective } from '../../ui/dialog/dialog.directive'
import { IconComponent } from '../../ui/icon/icon.component'

type Avatar = UserType['avatar']

const DEFAULT_AVATAR: Avatar = {
    backgroundColor: '#3B82F6',
    iconName: 'person-fill',
    emoji: null,
    type: 'icon',
    initials: '',
}

const sameAvatar = (a: Avatar, b: Avatar) =>
    a.type === b.type &&
    a.backgroundColor === b.backgroundColor &&
    a.iconName === b.iconName &&
    a.emoji === b.emoji &&
    a.initials === b.initials

/**
 * Edits the signed-in account's avatar (#242). Picks only change the preview; Save stores them in one request,
 * and the dialog closes once they are stored. A failed save keeps the dialog and the picks, with the reason next
 * to Save; closing discards the picks, so the page only ever shows the stored avatar.
 */
@Component({
    imports: [AvatarEditorComponent, ButtonComponent, DialogDirective, IconComponent],
    selector: 'app-modal-avatar-editor',
    templateUrl: 'modal-avatar-editor.component.html',
})
export class ModalAvatarEditorComponent {
    private readonly dataService = inject(DataService)
    private readonly injector = inject(Injector)
    private readonly destroyRef = inject(DestroyRef)
    private readonly saveButton = viewChild('saveButton', { read: ElementRef<HTMLButtonElement> })

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    public readonly isVisible = signal(false)
    /** The stored avatar when the dialog opened: the editor starts from it, and a re-read of the account does not reset the picks. */
    public readonly startAvatar = signal<Avatar>(DEFAULT_AVATAR)
    /** The latest picks, not saved yet. */
    public readonly draft = signal<Avatar | null>(null)
    public readonly isSaving = signal(false)
    public readonly saveError = signal<'not-saved' | 'maybe-saved' | null>(null)

    /** Something to store: a change, and initials when the avatar shows initials. */
    public readonly canSave = computed(() => {
        const draft = this.draft()
        if (!draft || sameAvatar(draft, this.startAvatar())) return false
        return draft.type !== 'initials' || draft.initials.trim() !== ''
    })

    // --------------------------------------------------------------------------
    //        Methods
    // --------------------------------------------------------------------------
    public showDialog() {
        this.startAvatar.set({ ...(this.dataService.currentUser()?.avatar ?? DEFAULT_AVATAR) })
        this.draft.set(null)
        this.saveError.set(null)
        this.isVisible.set(true)
    }

    /** Closing discards the picks. Not while saving: the answer decides whether the dialog stays to say what went wrong. */
    public hideDialog() {
        if (this.isSaving()) return
        this.isVisible.set(false)
    }

    /** Picks wait while saving: the answer is about the picks that were sent. */
    public pick(avatar: Avatar) {
        if (this.isSaving()) return
        this.draft.set(avatar)
        this.saveError.set(null)
    }

    public async save(): Promise<void> {
        const draft = this.draft()
        if (!draft || !this.canSave() || this.isSaving()) return

        this.isSaving.set(true)
        this.saveError.set(null)
        try {
            await this.dataService.updateCurrentUserData({ avatar: draft })
            this.isSaving.set(false)
            this.hideDialog()
        } catch (error) {
            this.saveError.set(isSaveOutcomeUnknown(error) ? 'maybe-saved' : 'not-saved')
            // Save was disabled while it waited; back on it, so trying again is one key away. Not when the page was left.
            if (!this.destroyRef.destroyed) afterNextRender(() => this.saveButton()?.nativeElement.focus(), { injector: this.injector })
        } finally {
            this.isSaving.set(false)
        }
    }
}
