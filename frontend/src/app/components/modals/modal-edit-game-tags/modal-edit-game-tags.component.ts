import { CommonModule } from '@angular/common'
import { Component, EventEmitter, Output, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../../api/api'
import type { GameWithTagsAndTranslationsType, TagCategoryType, TagType } from '../../../api/api.types'
import { LogService } from '../../../core/services/log.service'
import { ToastService } from '../../toast/toast.service'
import { ButtonComponent } from '../../ui/button/button.component'
import { DialogDirective } from '../../ui/dialog/dialog.directive'
import { IconComponent } from '../../ui/icon/icon.component'

@Component({
    selector: 'app-modal-edit-game-tags',
    imports: [CommonModule, ButtonComponent, DialogDirective, IconComponent],
    templateUrl: './modal-edit-game-tags.component.html',
})
export class ModalEditGameTagsComponent {
    private readonly api = inject(Api)
    private readonly logger = inject(LogService)
    private readonly toastService = inject(ToastService)

    // --------------------------------------------------------------------------
    //        Signals
    // --------------------------------------------------------------------------
    public isVisible = signal<boolean>(false)
    public isLoading = signal<boolean>(false)
    public game = signal<GameWithTagsAndTranslationsType | null>(null)
    public tags = signal<Array<TagType>>([])
    public categories = signal<Array<TagCategoryType>>([])
    public selectedTagIds = signal<Set<number>>(new Set())

    // --------------------------------------------------------------------------
    //        Events
    // --------------------------------------------------------------------------
    @Output() public tagsUpdated = new EventEmitter<{ id: number; tagIds: number[] }>()

    // --------------------------------------------------------------------------
    //        Methods
    // --------------------------------------------------------------------------

    public showDialog(game: GameWithTagsAndTranslationsType, allTags: Array<TagType>, allCategories: Array<TagCategoryType>): void {
        this.game.set(game)
        this.tags.set(allTags)
        this.categories.set(allCategories)

        // Set currently selected tags
        const currentTagIds = new Set(game.tags.map((tag) => tag.id))
        this.selectedTagIds.set(currentTagIds)

        this.isVisible.set(true)
    }

    public hideDialog(): void {
        this.isVisible.set(false)
        this.game.set(null)
        this.tags.set([])
        this.categories.set([])
        this.selectedTagIds.set(new Set())
    }

    public toggleTag(tagId: number): void {
        const current = this.selectedTagIds()
        const newSet = new Set(current)

        if (newSet.has(tagId)) {
            newSet.delete(tagId)
        } else {
            newSet.add(tagId)
        }

        this.selectedTagIds.set(newSet)
    }

    public isTagSelected(tagId: number): boolean {
        return this.selectedTagIds().has(tagId)
    }

    public async onSubmit(): Promise<void> {
        const game = this.game()
        if (!game) {
            return
        }

        this.isLoading.set(true)

        try {
            const tagIds = Array.from(this.selectedTagIds())
            await firstValueFrom(this.api.updateAdminGameTags(game.id, tagIds))

            this.toastService.success('Game tags updated successfully.')
            this.tagsUpdated.emit({
                id: game.id,
                tagIds,
            })
            this.hideDialog()
        } catch (error) {
            this.logger.error('Error updating game tags', error)
            this.toastService.error('Failed to update game tags.')
        } finally {
            this.isLoading.set(false)
        }
    }

    public onCancel(): void {
        this.hideDialog()
    }

    // --------------------------------------------------------------------------
    //        Helper Methods
    // --------------------------------------------------------------------------

    public getTagsByCategory(categoryId: number): Array<TagType> {
        return this.tags().filter((tag) => tag.categoryId === categoryId)
    }

    public getCategoryName(categoryId: number): string {
        const category = this.categories().find((c) => c.id === categoryId)
        return category ? category.name : 'Unknown Category'
    }

    public getUniqueCategoryIds(): number[] {
        const categoryIds = this.tags().map((tag) => tag.categoryId)
        return [...new Set(categoryIds)].sort()
    }

    public getTagById(tagId: number): TagType | undefined {
        return this.tags().find((t) => t.id === tagId)
    }

    public getSelectedTagIdsArray(): number[] {
        return Array.from(this.selectedTagIds())
    }
}
