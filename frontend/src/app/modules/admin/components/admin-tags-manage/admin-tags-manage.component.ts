import { CommonModule } from '@angular/common'
import { Component, OnInit, inject, signal } from '@angular/core'
import { Api } from '../../../../api/api'
import type { TagCategoryType, TagType } from '../../../../api/api.types'
import { ToastService } from '../../../../components/toast/toast.service'
import { ButtonComponent } from '../../../../components/ui/button/button.component'
import { LogService } from '../../../../core/services/log.service'

@Component({
    imports: [CommonModule, ButtonComponent],
    templateUrl: './admin-tags-manage.component.html',
})
export class AdminTagsManageComponent implements OnInit {
    private readonly api = inject(Api)
    private readonly logger = inject(LogService)
    private readonly toastService = inject(ToastService)

    // --------------------------------------------------------------------------
    //        Component signals
    // --------------------------------------------------------------------------
    // Data
    public tags = signal<Array<TagType>>([])
    public tagCategories = signal<Array<TagCategoryType>>([])
    // Loading states
    public isLoadingCategories = signal<boolean>(false)
    public isLoadingTags = signal<boolean>(false)

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------

    ngOnInit(): void {
        this._fetchTags()
        this._fetchTagCategories()

        // --- Hardcoded Data (to be replaced by API calls) ---
        this.tagCategories.set([
            { id: 1, name: 'Mechanics', tags: [101, 102, 103], gameCount: 150 },
            { id: 2, name: 'Theme', tags: [201, 202], gameCount: 90 },
            { id: 3, name: 'Player Count', tags: [301], gameCount: 200 },
            { id: 4, name: 'Complexity', tags: [401, 402], gameCount: 120 },
        ])

        this.tags.set([
            { id: 101, name: 'Worker Placement', categoryId: 1, gameCount: 70 },
            { id: 102, name: 'Deck Building', categoryId: 1, gameCount: 50 },
            { id: 103, name: 'Cooperative', categoryId: 1, gameCount: 30 },
            { id: 201, name: 'Sci-Fi', categoryId: 2, gameCount: 60 },
            { id: 202, name: 'Fantasy', categoryId: 2, gameCount: 30 },
            { id: 301, name: '2 Players', categoryId: 3, gameCount: 200 },
            { id: 401, name: 'Light Strategy', categoryId: 4, gameCount: 80 },
            { id: 402, name: 'Heavy Euro', categoryId: 4, gameCount: 40 },
        ])
    }

    private _fetchTagCategories(): void {
        // this.isLoadingCategories.set(true)
        // this.api.getAdminTagCategories().subscribe({
        //     next: categories => {
        //         this.tagCategories.set(categories)
        //         this.isLoadingCategories.set(false)
        //         this.logger.log('Fetched tag categories successfully')
        //     },
        //     error: err => {
        //         this.logger.error('Error fetching tag categories', err)
        //         this.toastService.error('Could not load tag categories.')
        //         this.isLoadingCategories.set(false)
        //     },
        // })
    }

    private _fetchTags(): void {
        // this.isLoadingTags.set(true)
        // this.api.getAdminTags().subscribe({
        //     next: tags => {
        //         this.tags.set(tags)
        //         this.isLoadingTags.set(false)
        //         this.logger.log('Fetched tags successfully')
        //     },
        //     error: err => {
        //         this.logger.error('Error fetching tags', err)
        //         this.toastService.error('Could not load tags.')
        //         this.isLoadingTags.set(false)
        //     },
        // })
    }

    // editTagCategory(category: TagCategory) { /* ... */ }
    // deleteTagCategory(categoryId: number) { /* ... */ }

    // addTag() { /* ... */ }
    // editTag(tag: Tag) { /* ... */ }
    // deleteTag(tagId: number) { /* ... */ }
}
