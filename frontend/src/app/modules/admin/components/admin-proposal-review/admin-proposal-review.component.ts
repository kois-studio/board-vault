import { Component, computed, inject, OnInit, signal } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../../../api/api'
import type { AdminGameProposalType, GameWithTagsAndTranslationsType, TagCategoryType, TagType } from '../../../../api/api.types'
import { ButtonComponent } from '../../../../components/ui/button/button.component'
import { DialogDirective } from '../../../../components/ui/dialog/dialog.directive'
import { IconComponent } from '../../../../components/ui/icon/icon.component'
import { ImageBackgroundComponent } from '../../../../components/ui/image-background/image-background.component'
import { SpinnerComponent } from '../../../../components/ui/spinner/spinner.component'
import { LogService } from '../../../../core/services/log.service'
import { AdminGameProposalsService } from '../admin-game-proposals/admin-game-proposals.service'
import { AdminPageHeaderComponent } from '../admin-page-header/admin-page-header.component'
import { duplicateSearchTerms, matchProposedTags, parseProposedTags, QUICK_REJECTION_REASONS } from './proposal-review.utils'

type TagGroup = { id: number; name: string; tags: Array<TagType> }

/** One proposal, reviewed: what was submitted, possible duplicates, and the catalogue fields the admin approves. */
@Component({
    selector: 'app-admin-proposal-review',
    imports: [
        AdminPageHeaderComponent,
        ButtonComponent,
        DialogDirective,
        IconComponent,
        ImageBackgroundComponent,
        ReactiveFormsModule,
        RouterLink,
        SpinnerComponent,
    ],
    providers: [AdminGameProposalsService],
    templateUrl: './admin-proposal-review.component.html',
})
export class AdminProposalReviewComponent implements OnInit {
    private readonly api = inject(Api)
    private readonly logger = inject(LogService)
    private readonly router = inject(Router)
    private readonly route = inject(ActivatedRoute)
    private readonly proposalsService = inject(AdminGameProposalsService)

    public readonly proposal = signal<AdminGameProposalType | null>(null)
    public readonly isLoading = signal(true)
    public readonly loadError = signal<string | null>(null)
    public readonly isSubmitting = signal(false)

    public readonly tagGroups = signal<Array<TagGroup>>([])
    public readonly selectedTagIds = signal<ReadonlySet<number>>(new Set())
    /** Categories open on arrival: the ones holding a pre-selected tag. Fixed, so a toggle never folds the one in use. */
    public readonly initiallyOpenGroups = signal<ReadonlySet<number>>(new Set())
    public readonly possibleDuplicates = signal<Array<GameWithTagsAndTranslationsType>>([])

    public readonly proposedTags = computed(() => parseProposedTags(this.proposal()?.proposedTags ?? null))
    public readonly selectedTags = computed(() =>
        this.tagGroups()
            .flatMap((group) => group.tags)
            .filter((tag) => this.selectedTagIds().has(tag.id)),
    )
    public readonly isPending = computed(() => this.proposal()?.status === 'pending')

    public readonly form = new FormGroup({
        titleEn: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
        titleEs: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
        imageUrl: new FormControl('', {
            nonNullable: true,
            validators: [Validators.pattern(/^https?:\/\/.+/), Validators.maxLength(2048)],
        }),
        minPlayers: new FormControl<number | null>(null, [Validators.required, Validators.min(1), Validators.max(100)]),
        maxPlayers: new FormControl<number | null>(null, [Validators.required, Validators.min(1), Validators.max(100)]),
        gameAvgDuration: new FormControl<number | null>(null, [Validators.required, Validators.min(1), Validators.max(1440)]),
        reviewNotes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
    })

    /** The live artwork preview follows the field, but only once it looks like a URL. */
    public readonly imagePreview = signal('')

    // Reject and duplicate dialogs
    public readonly quickReasons = QUICK_REJECTION_REASONS
    public readonly isRejecting = signal(false)
    public readonly rejectReason = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(2000)] })

    public readonly isMarkingDuplicate = signal(false)
    public readonly duplicateSearch = new FormControl('', { nonNullable: true })
    public readonly duplicateResults = signal<Array<GameWithTagsAndTranslationsType>>([])
    public readonly isSearchingDuplicates = signal(false)
    public readonly duplicateOf = signal<GameWithTagsAndTranslationsType | null>(null)
    public readonly duplicateNotes = new FormControl('', { nonNullable: true, validators: [Validators.maxLength(280)] })

    public async ngOnInit(): Promise<void> {
        const proposalId = Number.parseInt(this.route.snapshot.paramMap.get('id') || '', 10)
        try {
            const [proposal, tags, categories] = await Promise.all([
                firstValueFrom(this.api.getAdminGameProposal(proposalId)),
                firstValueFrom(this.api.getAdminTags()),
                firstValueFrom(this.api.getAdminTagCategories()),
            ])
            this.proposal.set(proposal)
            const preselected = new Set(matchProposedTags(parseProposedTags(proposal.proposedTags), tags))
            this.tagGroups.set(this.groupTags(tags, categories))
            this.selectedTagIds.set(preselected)
            this.initiallyOpenGroups.set(new Set(tags.filter((tag) => preselected.has(tag.id)).map((tag) => tag.categoryId)))
            this.form.reset({
                titleEn: proposal.title,
                // Spanish starts as a copy: most titles are the same in both.
                titleEs: proposal.title,
                imageUrl: proposal.imageUrl ?? '',
                minPlayers: proposal.minPlayers,
                maxPlayers: proposal.maxPlayers,
                gameAvgDuration: proposal.gameAvgDuration,
                reviewNotes: '',
            })
            this.updateImagePreview()
            if (proposal.status !== 'pending') this.form.disable()
            void this.findPossibleDuplicates(proposal.title)
        } catch (error) {
            this.logger.error('Error loading the proposal:', error)
            this.loadError.set('This proposal could not be loaded. It may have been deleted.')
        } finally {
            this.isLoading.set(false)
        }
    }

    // --------------------------------------------------------------------------
    //        Catalogue fields
    // --------------------------------------------------------------------------
    public updateImagePreview(): void {
        const control = this.form.controls.imageUrl
        this.imagePreview.set(control.valid ? control.value.trim() : '')
    }

    public selectedInGroup(group: TagGroup): number {
        return group.tags.filter((tag) => this.selectedTagIds().has(tag.id)).length
    }

    public isTagSelected(tagId: number): boolean {
        return this.selectedTagIds().has(tagId)
    }

    public toggleTag(tagId: number): void {
        const next = new Set(this.selectedTagIds())
        if (next.has(tagId)) next.delete(tagId)
        else next.add(tagId)
        this.selectedTagIds.set(next)
    }

    public get playersOutOfOrder(): boolean {
        const { minPlayers, maxPlayers } = this.form.getRawValue()
        return minPlayers !== null && maxPlayers !== null && minPlayers > maxPlayers
    }

    public async approve(): Promise<void> {
        const proposal = this.proposal()
        this.form.markAllAsTouched()
        if (!proposal || this.form.invalid || this.playersOutOfOrder) return

        const value = this.form.getRawValue()
        this.isSubmitting.set(true)
        const createdGameId = await this.proposalsService.approveProposal(proposal.id, {
            translations: { en: value.titleEn.trim(), es: value.titleEs.trim() },
            imageUrl: value.imageUrl.trim(),
            minPlayers: value.minPlayers ?? undefined,
            maxPlayers: value.maxPlayers ?? undefined,
            gameAvgDuration: value.gameAvgDuration ?? undefined,
            tagIds: [...this.selectedTagIds()],
            reviewNotes: value.reviewNotes.trim() || undefined,
        })
        this.isSubmitting.set(false)
        if (createdGameId !== null) void this.router.navigate(['/admin/proposals'])
    }

    // --------------------------------------------------------------------------
    //        Reject
    // --------------------------------------------------------------------------
    public openReject(): void {
        this.rejectReason.reset('')
        this.isRejecting.set(true)
    }

    public useQuickReason(reason: string): void {
        this.rejectReason.setValue(reason)
    }

    public async confirmReject(): Promise<void> {
        const proposal = this.proposal()
        const reason = this.rejectReason.value.trim()
        this.rejectReason.markAsTouched()
        if (!proposal || !reason || this.rejectReason.invalid) return

        this.isSubmitting.set(true)
        const rejected = await this.proposalsService.rejectProposal(proposal.id, reason)
        this.isSubmitting.set(false)
        if (rejected) {
            this.isRejecting.set(false)
            void this.router.navigate(['/admin/proposals'])
        }
    }

    // --------------------------------------------------------------------------
    //        Duplicate of…
    // --------------------------------------------------------------------------
    public openDuplicate(game: GameWithTagsAndTranslationsType | null = null): void {
        this.duplicateOf.set(game)
        this.duplicateNotes.reset('')
        this.duplicateSearch.reset('')
        this.duplicateResults.set(game ? [] : this.possibleDuplicates())
        this.isMarkingDuplicate.set(true)
    }

    public async searchDuplicates(): Promise<void> {
        const term = this.duplicateSearch.value.trim()
        if (term.length < 2) return
        this.isSearchingDuplicates.set(true)
        try {
            const result = await firstValueFrom(this.api.getAdminGames(term, 1, 8))
            this.duplicateResults.set(result.games)
        } catch (error) {
            this.logger.error('Error searching the catalogue:', error)
            this.duplicateResults.set([])
        } finally {
            this.isSearchingDuplicates.set(false)
        }
    }

    public async confirmDuplicate(): Promise<void> {
        const proposal = this.proposal()
        const game = this.duplicateOf()
        if (!proposal || !game || this.duplicateNotes.invalid) return

        this.isSubmitting.set(true)
        const marked = await this.proposalsService.markAsDuplicate(proposal.id, game.id, this.duplicateNotes.value.trim() || undefined)
        this.isSubmitting.set(false)
        if (marked) {
            this.isMarkingDuplicate.set(false)
            void this.router.navigate(['/admin/proposals'])
        }
    }

    public gameTitle(game: GameWithTagsAndTranslationsType): string {
        return game.translations.en || game.translations.es || game.title || `Game ${game.id}`
    }

    public addToText(addTo: AdminGameProposalType['addTo']): string {
        if (addTo === 'shelf') return 'They own it: it goes on their shelf when approved.'
        if (addTo === 'wishlist') return 'They want it: it goes on their wishlist when approved.'
        return 'Only for the catalogue.'
    }

    public formatDate(dateString: string): string {
        return this.proposalsService.formatDate(dateString)
    }

    public statusText(): string {
        const proposal = this.proposal()
        return proposal ? this.proposalsService.getStatusText(proposal.status) : ''
    }

    // --------------------------------------------------------------------------
    //        Helpers
    // --------------------------------------------------------------------------
    private async findPossibleDuplicates(title: string): Promise<void> {
        try {
            const searches = await Promise.all(
                duplicateSearchTerms(title).map((term) => firstValueFrom(this.api.getAdminGames(term, 1, 5))),
            )
            const byId = new Map<number, GameWithTagsAndTranslationsType>()
            for (const game of searches.flatMap((result) => result.games)) byId.set(game.id, game)
            this.possibleDuplicates.set([...byId.values()].slice(0, 5))
        } catch (error) {
            // A failed hint is not worth an error on the page; the search in "Duplicate of…" still works.
            this.logger.error('Error looking for possible duplicates:', error)
        }
    }

    private groupTags(tags: Array<TagType>, categories: Array<TagCategoryType>): Array<TagGroup> {
        const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)
        return categories
            .map((category) => ({
                id: category.id,
                name: category.name,
                tags: tags.filter((tag) => tag.categoryId === category.id).sort(byName),
            }))
            .filter((group) => group.tags.length > 0)
            .sort(byName)
    }
}
