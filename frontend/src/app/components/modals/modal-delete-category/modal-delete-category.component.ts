import { CommonModule } from '@angular/common'
import { Component, EventEmitter, Output, inject, signal } from '@angular/core'
import { Api } from '../../../api/api'
import type { TagCategoryType, TagType } from '../../../api/api.types'
import { LogService } from '../../../core/services/log.service'
import { TagsComponent } from '../../tags/tags.component'
import { ToastService } from '../../toast/toast.service'
import { ButtonComponent } from '../../ui/button/button.component'
import { IconComponent } from '../../ui/icon/icon.component'

@Component({
    imports: [CommonModule, ButtonComponent, TagsComponent, IconComponent],
    selector: 'app-modal-delete-category',
    templateUrl: './modal-delete-category.component.html',
})
export class ModalDeleteCategoryComponent {
    private readonly logger = inject(LogService)
    private readonly toastService = inject(ToastService)
    private readonly api = inject(Api)

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    public isVisible = signal<boolean>(false)
    public category = signal<TagCategoryType | null>(null)
    public tags = signal<Array<TagType>>([])
    public isLoading = signal<boolean>(false)

    // --------------------------------------------------------------------------
    //        Events
    // --------------------------------------------------------------------------
    @Output() categoryDeleted = new EventEmitter<number>()

    // --------------------------------------------------------------------------
    //        Methods
    // --------------------------------------------------------------------------
    public showDialog(category: TagCategoryType, tags: Array<TagType>): void {
        this.category.set(category)
        this.tags.set(tags)
        this.isVisible.set(true)
    }

    public hideDialog(): void {
        this.isVisible.set(false)
        this.category.set(null)
        this.tags.set([])
    }

    public getTagsForDisplay(): Array<{ tag: string; category: string }> {
        return this.tags().map((tag) => ({
            tag: tag.name,
            category: 'Will be deleted',
        }))
    }

    public onConfirmDelete(): void {
        const category = this.category()
        if (!category) {
            return
        }

        this.isLoading.set(true)

        // Call API to delete category
        this.api.deleteAdminTagCategory(category.id).subscribe({
            next: () => {
                this.isLoading.set(false)
                this.toastService.success('Category deleted successfully!')
                this.categoryDeleted.emit(this.category()?.id)
                this.hideDialog()
            },
            error: (error: any) => {
                this.isLoading.set(false)
                this.logger.error('Error deleting category:', error)
                this.toastService.error('Failed to delete category. Please try again.')
            },
        })
    }
}
