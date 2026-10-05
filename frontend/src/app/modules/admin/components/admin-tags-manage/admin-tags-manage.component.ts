// src/app/pages/admin/tags-manage/admin-tags-manage.component.ts

import { HttpErrorResponse } from '@angular/common/http'
import { Component, computed, inject, OnInit, signal, ViewChild } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../../../api/api'
import type { TagCategoryType, TagType } from '../../../../api/api.types'
import { ModalAddCategoryComponent } from '../../../../components/modals/modal-add-category/modal-add-category.component'
import { ModalAddTagComponent } from '../../../../components/modals/modal-add-tag/modal-add-tag.component'
import { ModalDeleteCategoryComponent } from '../../../../components/modals/modal-delete-category/modal-delete-category.component'
import { ModalDeleteTagComponent } from '../../../../components/modals/modal-delete-tag/modal-delete-tag.component'
import { ModalEditCategoryComponent } from '../../../../components/modals/modal-edit-category/modal-edit-category.component'
import { ModalEditTagComponent } from '../../../../components/modals/modal-edit-tag/modal-edit-tag.component'
import { ToastService } from '../../../../components/toast/toast.service'
import { ButtonComponent } from '../../../../components/ui/button/button.component'
import { DialogDirective } from '../../../../components/ui/dialog/dialog.directive'
import { IconComponent } from '../../../../components/ui/icon/icon.component'
import { SpinnerComponent } from '../../../../components/ui/spinner/spinner.component'
import { AdminPageHeaderComponent } from '../admin-page-header/admin-page-header.component'
import { AdminTagsManageService } from './admin-tags-manage.service'

@Component({
    imports: [
        AdminPageHeaderComponent,
        ButtonComponent,
        DialogDirective,
        IconComponent,
        SpinnerComponent,
        ModalEditCategoryComponent,
        ModalEditTagComponent,
        ModalAddCategoryComponent,
        ModalAddTagComponent,
        ModalDeleteCategoryComponent,
        ModalDeleteTagComponent,
    ],
    templateUrl: './admin-tags-manage.component.html',
})
export class AdminTagsManageComponent implements OnInit {
    private readonly toastService = inject(ToastService)
    private readonly adminTagsManageService = inject(AdminTagsManageService)
    private readonly api = inject(Api)

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
    public readonly errorMessage = this.adminTagsManageService.errorMessage

    /** Filters the tags by name; categories without a match are hidden while searching. */
    public readonly search = signal('')
    public readonly sections = computed(() => {
        const term = this.search().trim().toLowerCase()
        const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)
        return [...this.tagCategories()]
            .sort(byName)
            .map((category) => ({
                category,
                tags: this.tags()
                    .filter((tag) => tag.categoryId === category.id && (!term || tag.name.toLowerCase().includes(term)))
                    .sort(byName),
            }))
            .filter((section) => !term || section.tags.length > 0)
    })

    // Merge: every game with the merged tag gets the kept one; the merged tag is deleted.
    public readonly mergingTag = signal<TagType | null>(null)
    public readonly mergeIntoId = signal<number | null>(null)
    public readonly isMerging = signal(false)
    public readonly mergeInto = computed(() => this.tags().find((tag) => tag.id === this.mergeIntoId()) ?? null)
    public readonly mergeTargets = computed(() => {
        const merging = this.mergingTag()
        return this.tags()
            .filter((tag) => tag.id !== merging?.id)
            .map((tag) => ({ ...tag, categoryName: this.tagCategories().find((category) => category.id === tag.categoryId)?.name ?? '' }))
            .sort((a, b) => a.categoryName.localeCompare(b.categoryName) || a.name.localeCompare(b.name))
    })

    public async retryData(): Promise<void> {
        try {
            await this.adminTagsManageService.refreshData()
        } catch {
            this.toastService.error('Could not refresh data.')
        }
    }

    async ngOnInit(): Promise<void> {
        try {
            await this.adminTagsManageService.initialize()
        } catch {
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
        const categoryTags = this.tags().filter((tag) => tag.categoryId === category.id)
        this.deleteCategoryModal.showDialog(category, categoryTags)
    }

    public onAddTag(): void {
        this.addTagModal.showDialog(this.tagCategories())
    }

    public onEditTag(tag: TagType): void {
        this.editTagModal.showDialog(tag, this.tagCategories())
    }

    public onDeleteTag(tag: TagType): void {
        const categoryName = this.tagCategories().find((cat) => cat.id === tag.categoryId)?.name || 'Unknown'
        this.deleteTagModal.showDialog(tag, categoryName)
    }

    public onMergeTag(tag: TagType): void {
        this.mergeIntoId.set(null)
        this.mergingTag.set(tag)
    }

    public setMergeInto(value: string): void {
        const tagId = Number.parseInt(value, 10)
        this.mergeIntoId.set(Number.isInteger(tagId) ? tagId : null)
    }

    public async confirmMerge(): Promise<void> {
        const tag = this.mergingTag()
        const into = this.mergeInto()
        if (!tag || !into) return

        this.isMerging.set(true)
        try {
            const { gamesMoved } = await firstValueFrom(this.api.mergeAdminTag(tag.id, into.id))
            this.mergingTag.set(null)
            this.toastService.success(
                `"${tag.name}" merged into "${into.name}". ${gamesMoved} ${gamesMoved === 1 ? 'game' : 'games'} gained it.`,
            )
            await this.adminTagsManageService.refreshData()
        } catch (error) {
            const message = error instanceof HttpErrorResponse && error.status === 400 ? error.error?.message : null
            this.toastService.error(typeof message === 'string' ? message : 'The tags could not be merged. Try again.')
        } finally {
            this.isMerging.set(false)
        }
    }

    // --------------------------------------------------------------------------
    //        Event Handlers
    // --------------------------------------------------------------------------
    public async onCategoryUpdated(_update: { id: number; name: string }): Promise<void> {
        try {
            await this.adminTagsManageService.refreshData()
        } catch {
            this.toastService.error('Could not refresh data.')
        }
    }

    public async onTagUpdated(_update: { id: number; name: string; categoryId: number }): Promise<void> {
        try {
            await this.adminTagsManageService.refreshData()
        } catch {
            this.toastService.error('Could not refresh data.')
        }
    }

    public async onCategoryCreated(_category: TagCategoryType): Promise<void> {
        try {
            await this.adminTagsManageService.refreshData()
        } catch {
            this.toastService.error('Could not refresh data.')
        }
    }

    public async onTagCreated(_tag: TagType): Promise<void> {
        try {
            await this.adminTagsManageService.refreshData()
        } catch {
            this.toastService.error('Could not refresh data.')
        }
    }

    public async onCategoryDeleted(_categoryId: number): Promise<void> {
        try {
            await this.adminTagsManageService.refreshData()
        } catch {
            this.toastService.error('Could not refresh data.')
        }
    }

    public async onTagDeleted(_tagId: number): Promise<void> {
        try {
            await this.adminTagsManageService.refreshData()
        } catch {
            this.toastService.error('Could not refresh data.')
        }
    }
}
