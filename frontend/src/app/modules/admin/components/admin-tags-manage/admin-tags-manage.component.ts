// src/app/pages/admin/tags-manage/admin-tags-manage.component.ts

import { CommonModule } from '@angular/common'
import { Component, OnInit, computed, inject, signal, ViewChild } from '@angular/core'
import { Api } from '../../../../api/api'
import type { TagCategoryType, TagType } from '../../../../api/api.types'
import { ToastService } from '../../../../components/toast/toast.service'
import { ButtonComponent } from '../../../../components/ui/button/button.component'
import { LogService } from '../../../../core/services/log.service'
import { ModalEditCategoryComponent } from '../../../../components/modals/modal-edit-category/modal-edit-category.component'
import { ModalEditTagComponent } from '../../../../components/modals/modal-edit-tag/modal-edit-tag.component'

@Component({
    imports: [CommonModule, ButtonComponent, ModalEditCategoryComponent, ModalEditTagComponent],
    templateUrl: './admin-tags-manage.component.html',
})
export class AdminTagsManageComponent implements OnInit {
    private readonly api = inject(Api)
    private readonly logger = inject(LogService)
    private readonly toastService = inject(ToastService)

    // --------------------------------------------------------------------------
    //        Modal references
    // --------------------------------------------------------------------------
    @ViewChild(ModalEditCategoryComponent) editCategoryModal!: ModalEditCategoryComponent
    @ViewChild(ModalEditTagComponent) editTagModal!: ModalEditTagComponent

    // --------------------------------------------------------------------------
    //        Signals
    // --------------------------------------------------------------------------
    public tags = signal<Array<TagType>>([])
    public tagCategories = signal<Array<TagCategoryType>>([])
    public isLoadingCategories = signal<boolean>(false)
    public isLoadingTags = signal<boolean>(false)

    // --------------------------------------------------------------------------
    //        Computed signals
    // --------------------------------------------------------------------------
    public tagsWithCategory = computed(() => {
        return this.tags().map(tag => ({
            ...tag,
            categoryName: this.tagCategories().find(category => category.id === tag.categoryId),
        }))
    })

    ngOnInit(): void {
        this._fetchTagCategories()
        this._fetchTags()
    }

    private _fetchTagCategories(): void {
        this.isLoadingCategories.set(true)
        this.api.getAdminTagCategories().subscribe({
            next: categories => {
                this.tagCategories.set(categories)
                this.logger.log('Fetched tag categories successfully')
            },
            error: err => {
                this.logger.error('Error fetching tag categories', err)
                this.toastService.error('Could not load tag categories.')
            },
            complete: () => this.isLoadingCategories.set(false),
        })
    }

    private _fetchTags(): void {
        this.isLoadingTags.set(true)
        this.api.getAdminTags().subscribe({
            next: tags => {
                this.tags.set(tags)
                this.logger.log('Fetched tags successfully')
            },
            error: err => {
                this.logger.error('Error fetching tags', err)
                this.toastService.error('Could not load tags.')
            },
            complete: () => this.isLoadingTags.set(false),
        })
    }

    // --------------------------------------------------------------------------
    //        Action Handlers (to be implemented with modals/forms)
    // --------------------------------------------------------------------------

    public onAddCategory(): void {
        // TODO: Open a modal to get the new category name
        this.logger.log('Action: Add Category')
        // Example: this.api.createAdminTagCategory('New Name').subscribe(...)
    }

    public onEditCategory(category: TagCategoryType): void {
        this.editCategoryModal.showDialog(category)
    }

    public onDeleteCategory(category: TagCategoryType): void {
        // TODO: Open a confirmation modal
        this.logger.warn('Action: Delete Category', category)
    }

    public onAddTag(): void {
        // TODO: Open a modal with fields for name and a dropdown for category
        this.logger.log('Action: Add Tag')
    }

    public onEditTag(tag: TagType): void {
        this.editTagModal.showDialog(tag, this.tagCategories())
    }

    public onDeleteTag(tag: TagType): void {
        // TODO: Open a confirmation modal
        this.logger.warn('Action: Delete Tag', tag)
    }

    // --------------------------------------------------------------------------
    //        Event Handlers
    // --------------------------------------------------------------------------
    public onCategoryUpdated(update: { id: number; name: string }): void {
        // Refresh data from server to get the latest state
        this._fetchTagCategories()
    }

    public onTagUpdated(update: { id: number; name: string; categoryId: number }): void {
        // Refresh data from server to get the latest state
        this._fetchTags()
    }
}
