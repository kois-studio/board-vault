import { Component, computed, inject, OnInit, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../../../api/api'
import type { AdminGameProposalType, AdminGameType } from '../../../../api/api.types'
import { ButtonComponent } from '../../../../components/ui/button/button.component'
import { DialogDirective } from '../../../../components/ui/dialog/dialog.directive'
import { IconComponent } from '../../../../components/ui/icon/icon.component'
import { ImageBackgroundComponent } from '../../../../components/ui/image-background/image-background.component'
import { SpinnerComponent } from '../../../../components/ui/spinner/spinner.component'
import { languageName } from '../../../../core/i18n/language-names'
import { LogService } from '../../../../core/services/log.service'
import { rowsFromProposal, toEditionsBody } from '../admin-game-editions/edition-rows'
import {
    AdminGameFieldsComponent,
    createGameFieldsForm,
    groupTags,
    playersOutOfOrder,
    retailPriceValue,
    type TagGroup,
} from '../admin-game-fields/admin-game-fields.component'
import { AdminGameProposalsService } from '../admin-game-proposals/admin-game-proposals.service'
import { AdminPageHeaderComponent } from '../admin-page-header/admin-page-header.component'
import { duplicateSearchTerms, parseProposedTags, QUICK_REJECTION_REASONS } from './proposal-review.utils'

/**
 * One proposal, reviewed in two steps (#327): first "is it already in the catalogue?" (mark a duplicate,
 * reject, or delete), then the catalogue entry to approve. Tags start empty and folded: games are tagged
 * together after approval (docs/how-to/tag-untagged-games.md).
 */
@Component({
    selector: 'app-admin-proposal-review',
    imports: [
        AdminGameFieldsComponent,
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
    public readonly possibleDuplicates = signal<Array<AdminGameType>>([])

    public readonly proposedTags = computed(() => parseProposedTags(this.proposal()?.proposedTags ?? null))
    public readonly isPending = computed(() => this.proposal()?.status === 'pending')
    public readonly step = signal<'check' | 'catalogue'>('check')

    /** What proposals sent before #325 also carried, shown as a hint next to the proposal. */
    public readonly legacyDetails = computed(() => {
        const proposal = this.proposal()
        if (!proposal) return []
        const details: Array<{ label: string; value: string }> = []
        for (const other of proposal.otherTitles)
            details.push({ label: `Title in ${languageName(other.languageCode)}`, value: other.title })
        if (proposal.minPlayers || proposal.maxPlayers) {
            details.push({ label: 'Players', value: `${proposal.minPlayers ?? '?'}–${proposal.maxPlayers ?? '?'}` })
        }
        if (proposal.gameAvgDuration) details.push({ label: 'Length', value: `${proposal.gameAvgDuration} min` })
        const tags = this.proposedTags()
        if (tags.length > 0) details.push({ label: 'Tags', value: tags.join(', ') })
        if (proposal.imageUrl) details.push({ label: 'Artwork', value: proposal.imageUrl })
        return details
    })

    public readonly form = createGameFieldsForm()
    public readonly reviewNotes = new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] })

    // Reject and duplicate dialogs
    public readonly quickReasons = QUICK_REJECTION_REASONS
    public readonly isRejecting = signal(false)
    public readonly rejectReason = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(2000)] })

    public readonly duplicateOf = signal<AdminGameType | null>(null)
    public readonly isDeleting = signal(false)

    // Step 1: the catalogue games it may duplicate, found from its title or searched by hand
    public readonly catalogueSearch = new FormControl('', { nonNullable: true })
    public readonly isSearchingCatalogue = signal(false)
    public readonly searchedTerm = signal<string | null>(null)
    private readonly searchResults = signal<Array<AdminGameType> | null>(null)
    public readonly candidates = computed(() => this.searchResults() ?? this.possibleDuplicates())
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
            // No tags preselected: they are set after approval, for every untagged game at once.
            this.selectedTagIds.set(new Set())
            this.tagGroups.set(groupTags(tags, categories))
            this.form.reset({
                // The proposal's title in its language is primary, then the other titles it listed.
                editions: rowsFromProposal(proposal),
                imageUrl: proposal.imageUrl ?? '',
                minPlayers: proposal.minPlayers,
                maxPlayers: proposal.maxPlayers,
                gameAvgDuration: proposal.gameAvgDuration,
                retailPrice: null,
            })
            if (proposal.status !== 'pending') this.form.disable()
            this.catalogueSearch.setValue(proposal.title)
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
    public get playersOutOfOrder(): boolean {
        return playersOutOfOrder(this.form)
    }

    public async approve(): Promise<void> {
        const proposal = this.proposal()
        this.form.markAllAsTouched()
        if (!proposal || this.form.invalid || this.playersOutOfOrder) return

        const value = this.form.getRawValue()
        this.isSubmitting.set(true)
        const createdGameId = await this.proposalsService.approveProposal(proposal.id, {
            editions: toEditionsBody(value.editions),
            imageUrl: value.imageUrl.trim(),
            minPlayers: value.minPlayers ?? undefined,
            maxPlayers: value.maxPlayers ?? undefined,
            gameAvgDuration: value.gameAvgDuration ?? undefined,
            retailPrice: retailPriceValue(this.form) ?? undefined,
            tagIds: [...this.selectedTagIds()],
            reviewNotes: this.reviewNotes.value.trim() || undefined,
        })
        this.isSubmitting.set(false)
        if (createdGameId !== null) void this.router.navigate(['/admin/proposals'])
    }

    // --------------------------------------------------------------------------
    //        Steps
    // --------------------------------------------------------------------------
    public goToCatalogueEntry(): void {
        this.step.set('catalogue')
        this.scrollToTop()
    }

    public backToCheck(): void {
        this.step.set('check')
        this.scrollToTop()
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
    public openDuplicate(game: AdminGameType): void {
        this.duplicateNotes.reset('')
        this.duplicateOf.set(game)
    }

    public async searchCatalogue(): Promise<void> {
        const term = this.catalogueSearch.value.trim()
        if (term.length < 2) {
            // An emptied search goes back to the matches found from the title.
            this.searchResults.set(null)
            this.searchedTerm.set(null)
            return
        }
        this.isSearchingCatalogue.set(true)
        try {
            const result = await firstValueFrom(this.api.getAdminGames({ search: term }, 1, 8))
            this.searchResults.set(result.games)
            this.searchedTerm.set(term)
        } catch (error) {
            this.logger.error('Error searching the catalogue:', error)
            this.searchResults.set([])
            this.searchedTerm.set(term)
        } finally {
            this.isSearchingCatalogue.set(false)
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
            this.duplicateOf.set(null)
            void this.router.navigate(['/admin/proposals'])
        }
    }

    // --------------------------------------------------------------------------
    //        Delete
    // --------------------------------------------------------------------------
    public async confirmDelete(): Promise<void> {
        const proposal = this.proposal()
        if (!proposal) return

        this.isSubmitting.set(true)
        const deleted = await this.proposalsService.deleteProposal(proposal.id, { reload: false })
        this.isSubmitting.set(false)
        if (deleted) {
            this.isDeleting.set(false)
            void this.router.navigate(['/admin/proposals'])
        }
    }

    public languageName(code: string): string {
        return languageName(code)
    }

    public gameTitle(game: AdminGameType): string {
        return game.title || game.editions[0]?.title || `Game ${game.id}`
    }

    public addToText(addTo: AdminGameProposalType['addTo']): string {
        if (addTo === 'shelf') return 'Owns it: goes on their shelf'
        if (addTo === 'wishlist') return 'Wants it: goes on their wishlist'
        return 'Catalogue only'
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
    private scrollToTop(): void {
        if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
    }

    private async findPossibleDuplicates(title: string): Promise<void> {
        try {
            const searches = await Promise.all(
                duplicateSearchTerms(title).map((term) => firstValueFrom(this.api.getAdminGames({ search: term }, 1, 5))),
            )
            const byId = new Map<number, AdminGameType>()
            for (const game of searches.flatMap((result) => result.games)) byId.set(game.id, game)
            this.possibleDuplicates.set([...byId.values()].slice(0, 5))
        } catch (error) {
            // A failed hint is not worth an error on the page; the catalogue search above the list still works.
            this.logger.error('Error looking for possible duplicates:', error)
        }
    }
}
