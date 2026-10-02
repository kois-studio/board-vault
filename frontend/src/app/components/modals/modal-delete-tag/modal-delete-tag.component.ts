import { Component, inject, output, signal } from '@angular/core'
import { Api } from '../../../api/api'
import type { TagType } from '../../../api/api.types'
import { LogService } from '../../../core/services/log.service'
import { ToastService } from '../../toast/toast.service'
import { ButtonComponent } from '../../ui/button/button.component'
import { DialogDirective } from '../../ui/dialog/dialog.directive'
import { IconComponent } from '../../ui/icon/icon.component'

@Component({
    imports: [ButtonComponent, DialogDirective, IconComponent],
    selector: 'app-modal-delete-tag',
    templateUrl: './modal-delete-tag.component.html',
})
export class ModalDeleteTagComponent {
    private readonly logger = inject(LogService)
    private readonly toastService = inject(ToastService)
    private readonly api = inject(Api)

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    public isVisible = signal<boolean>(false)
    public tag = signal<TagType | null>(null)
    public categoryName = signal<string>('')
    public isLoading = signal<boolean>(false)

    // --------------------------------------------------------------------------
    //        Events
    // --------------------------------------------------------------------------
    readonly tagDeleted = output<number>()

    // --------------------------------------------------------------------------
    //        Methods
    // --------------------------------------------------------------------------
    public showDialog(tag: TagType, categoryName: string): void {
        this.tag.set(tag)
        this.categoryName.set(categoryName)
        this.isVisible.set(true)
    }

    public hideDialog(): void {
        this.isVisible.set(false)
        this.tag.set(null)
        this.categoryName.set('')
    }

    public onConfirmDelete(): void {
        const tag = this.tag()
        if (!tag) {
            return
        }

        this.isLoading.set(true)

        // Call API to delete tag
        this.api.deleteAdminTag(tag.id).subscribe({
            next: () => {
                this.isLoading.set(false)
                this.toastService.success('Tag deleted successfully!')
                this.tagDeleted.emit(tag.id)
                this.hideDialog()
            },
            error: (error: any) => {
                this.isLoading.set(false)
                this.logger.error('Error deleting tag:', error)
                this.toastService.error('Failed to delete tag. Please try again.')
            },
        })
    }
}
