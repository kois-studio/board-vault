// src/app/pages/admin/tags-manage/admin-tags-manage.component.ts

import { CommonModule } from '@angular/common'
import { Component, OnInit, inject, ViewChild } from '@angular/core'
import type { TagCategoryType, TagType } from '../../../../api/api.types'
import { ToastService } from '../../../../components/toast/toast.service'
import { ButtonComponent } from '../../../../components/ui/button/button.component'
import { SpinnerComponent } from '../../../../components/ui/spinner/spinner.component'
import { ModalEditCategoryComponent } from '../../../../components/modals/modal-edit-category/modal-edit-category.component'
import { ModalEditTagComponent } from '../../../../components/modals/modal-edit-tag/modal-edit-tag.component'
import { ModalAddCategoryComponent } from '../../../../components/modals/modal-add-category/modal-add-category.component'
import { ModalAddTagComponent } from '../../../../components/modals/modal-add-tag/modal-add-tag.component'
import { ModalDeleteCategoryComponent } from '../../../../components/modals/modal-delete-category/modal-delete-category.component'
import { ModalDeleteTagComponent } from '../../../../components/modals/modal-delete-tag/modal-delete-tag.component'
import { AdminTagsManageService } from './admin-tags-manage.service'

@Component({
    imports: [CommonModule, ButtonComponent, SpinnerComponent, ModalEditCategoryComponent, ModalEditTagComponent, ModalAddCategoryComponent, ModalAddTagComponent, ModalDeleteCategoryComponent, ModalDeleteTagComponent],
    templateUrl: './admin-tags-manage.component.html',
})
export class AdminTagsManageComponent implements OnInit {
    private readonly toastService = inject(ToastService)
    private readonly adminTagsManageService = inject(AdminTagsManageService)

    // --------------------------------------------------------------------------
    //        Modal references
    // --------------------------------------------------------------------------
    @ViewChild(ModalEditCategoryComponent) editCategoryModal!: ModalEditCategoryComponent
    @ViewChild(ModalEditTagComponent) editTagModal!: ModalEditTagComponent
    @ViewChild(ModalAddCategoryComponent) addCategoryModal!: ModalAddCategoryComponent
    @ViewChild(ModalAddTagComponent) addTagModal!: ModalAddTagComponent
    @ViewChild(ModalDeleteCategoryComponent) deleteCategoryModal!: ModalDeleteCategoryComponent
    @ViewChild(ModalDeleteTagComponent) deleteTagModal!: ModalDeleteTagComponent

    // --------------------------------------------------------------------------
    //        Service signals
    // --------------------------------------------------------------------------
    public readonly tags = this.adminTagsManageService.tags
    public readonly tagCategories = this.adminTagsManageService.tagCategories
    public readonly isLoadingCategories = this.adminTagsManageService.isLoadingCategories
    public readonly isLoadingTags = this.adminTagsManageService.isLoadingTags
    public readonly tagsWithCategory = this.adminTagsManageService.tagsWithCategory

    async ngOnInit(): Promise<void> {
        try {
            await this.adminTagsManageService.initialize()
        } catch (error) {
            this.toastService.error('Could not load tags and categories.')
        }
    }

    // --------------------------------------------------------------------------
    //        Action Handlers (to be implemented with modals/forms)
    // --------------------------------------------------------------------------

    public onAddCategory(): void {
        this.addCategoryModal.showDialog()
    }

    public onEditCategory(category: TagCategoryType): void {
        this.editCategoryModal.showDialog(category)
    }

    public onDeleteCategory(category: TagCategoryType): void {
        // Get the tags that belong to this category
        const categoryTags = this.tags().filter(tag => tag.categoryId === category.id)
        this.deleteCategoryModal.showDialog(category, categoryTags)
    }

    public onAddTag(): void {
        this.addTagModal.showDialog(this.tagCategories())
    }

    public onEditTag(tag: TagType): void {
        this.editTagModal.showDialog(tag, this.tagCategories())
    }

    public onDeleteTag(tag: TagType): void {
        const categoryName = this.tagCategories().find(cat => cat.id === tag.categoryId)?.name || 'Unknown'
        this.deleteTagModal.showDialog(tag, categoryName)
    }

    // --------------------------------------------------------------------------
    //        Event Handlers
    // --------------------------------------------------------------------------
    public async onCategoryUpdated(update: { id: number; name: string }): Promise<void> {
        try {
            await this.adminTagsManageService.refreshData()
        } catch (error) {
            this.toastService.error('Could not refresh data.')
        }
    }

    public async onTagUpdated(update: { id: number; name: string; categoryId: number }): Promise<void> {
        try {
            await this.adminTagsManageService.refreshData()
        } catch (error) {
            this.toastService.error('Could not refresh data.')
        }
    }

    public async onCategoryCreated(category: TagCategoryType): Promise<void> {
        try {
            await this.adminTagsManageService.refreshData()
        } catch (error) {
            this.toastService.error('Could not refresh data.')
        }
    }

    public async onTagCreated(tag: TagType): Promise<void> {
        try {
            await this.adminTagsManageService.refreshData()
        } catch (error) {
            this.toastService.error('Could not refresh data.')
        }
    }

    public async onCategoryDeleted(categoryId: number): Promise<void> {
        try {
            await this.adminTagsManageService.refreshData()
        } catch (error) {
            this.toastService.error('Could not refresh data.')
        }
    }

    public async onTagDeleted(tagId: number): Promise<void> {
        try {
            await this.adminTagsManageService.refreshData()
        } catch (error) {
            this.toastService.error('Could not refresh data.')
        }
    }
}
