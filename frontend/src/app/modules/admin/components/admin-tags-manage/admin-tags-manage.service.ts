import { Injectable, computed, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../../../api/api'
import type { TagCategoryType, TagType } from '../../../../api/api.types'
import { LogService } from '../../../../core/services/log.service'

/**
 * This service is used to keep the state of the admin tags manage page
 */
@Injectable({ providedIn: 'root' })
export class AdminTagsManageService {
    private readonly api = inject(Api)
    private readonly logger = inject(LogService)

    // --------------------------------------------------------------------------
    //        Signals
    // --------------------------------------------------------------------------
    public readonly tags = signal<Array<TagType>>([])
    public readonly tagCategories = signal<Array<TagCategoryType>>([])
    public readonly isLoadingCategories = signal<boolean>(false)
    public readonly isLoadingTags = signal<boolean>(false)
    public readonly isInitialized = signal<boolean>(false)

    // --------------------------------------------------------------------------
    //        Computed signals
    // --------------------------------------------------------------------------
    public readonly tagsWithCategory = computed(() => {
        return this.tags().map((tag) => ({
            ...tag,
            categoryName: this.tagCategories().find((category) => category.id === tag.categoryId),
        }))
    })

    // --------------------------------------------------------------------------
    //        Methods
    // --------------------------------------------------------------------------

    public async initialize(): Promise<void> {
        // Only initialize if not already done
        if (this.isInitialized()) {
            return
        }

        this.logger.log('Initializing admin tags manage service')
        await Promise.all([this._fetchTagCategories(), this._fetchTags()])
        this.isInitialized.set(true)
    }

    public async refreshData(): Promise<void> {
        this.logger.log('Refreshing admin tags manage data')
        await Promise.all([this._fetchTagCategories(), this._fetchTags()])
    }

    private async _fetchTagCategories(): Promise<void> {
        this.isLoadingCategories.set(true)

        try {
            const categories = await firstValueFrom(this.api.getAdminTagCategories())
            this.tagCategories.set(categories || [])
            this.logger.log('Fetched tag categories successfully')
        } catch (error) {
            this.logger.error('Error fetching tag categories', error)
            throw error
        } finally {
            this.isLoadingCategories.set(false)
        }
    }

    private async _fetchTags(): Promise<void> {
        this.isLoadingTags.set(true)

        try {
            const tags = await firstValueFrom(this.api.getAdminTags())
            this.tags.set(tags || [])
            this.logger.log('Fetched tags successfully')
        } catch (error) {
            this.logger.error('Error fetching tags', error)
            throw error
        } finally {
            this.isLoadingTags.set(false)
        }
    }
}
