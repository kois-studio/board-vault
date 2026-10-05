import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ReactiveFormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'
import { Api } from '../../../../api/api'
import type { CatalogueIssue, CatalogueTagType, GameLength } from '../../../../api/api.types'
import { ButtonComponent } from '../../../../components/ui/button/button.component'
import { IconComponent } from '../../../../components/ui/icon/icon.component'
import { ImageBackgroundComponent } from '../../../../components/ui/image-background/image-background.component'
import { SpinnerComponent } from '../../../../components/ui/spinner/spinner.component'
import { LogService } from '../../../../core/services/log.service'
import { GAME_LENGTH_OPTIONS } from '../../../../pages/collection-page/browse-page/browse-page.component'
import { AdminPageHeaderComponent } from '../admin-page-header/admin-page-header.component'
import { AdminGamesManageService } from './admin-games-manage.service'

/** What each data problem is called in the list, and what to do about it. */
export const CATALOGUE_ISSUES: Array<{ value: CatalogueIssue; label: string; hint: string }> = [
    { value: 'no-title', label: 'No title', hint: 'The game has no English title, so it cannot be found by name.' },
    { value: 'no-artwork', label: 'No artwork', hint: 'Add an artwork URL.' },
    {
        value: 'no-spanish',
        label: 'No Spanish title',
        hint: 'No Spanish title, or the same as the English one. Some games do keep their name.',
    },
    { value: 'no-tags', label: 'No tags', hint: 'Without tags the game is missing from tag filters and suggestions.' },
    {
        value: 'guessed-values',
        label: 'Guessed values',
        hint: 'Approved before review existed, with 60 min or 2–4 players guessed. A correct guess stays listed.',
    },
]

/** The admin catalogue: every game, searchable and filterable by Browse's filters and by data problem. */
@Component({
    imports: [
        AdminPageHeaderComponent,
        ButtonComponent,
        IconComponent,
        ImageBackgroundComponent,
        ReactiveFormsModule,
        RouterLink,
        SpinnerComponent,
    ],
    templateUrl: './admin-games-manage.component.html',
})
export class AdminGamesManageComponent implements OnInit {
    private readonly api = inject(Api)
    private readonly destroyRef = inject(DestroyRef)
    private readonly logger = inject(LogService)
    private readonly service = inject(AdminGamesManageService)

    protected readonly Math = Math
    public readonly issues = CATALOGUE_ISSUES
    public readonly lengthOptions = GAME_LENGTH_OPTIONS

    public readonly games = this.service.gamesList
    public readonly pagination = this.service.pagination
    public readonly filters = this.service.filters
    public readonly isLoading = this.service.isLoading
    public readonly errorMessage = this.service.errorMessage
    public readonly searchControl = this.service.searchControl
    public readonly catalogueTags = signal<Array<CatalogueTagType>>([])

    public readonly activeIssue = computed(() => this.issues.find((issue) => issue.value === this.filters().issue) ?? null)
    public readonly hasFilters = computed(() => {
        const { search, players, length, tagIds, issue } = this.filters()
        return Boolean(search || players || length || tagIds?.length || issue)
    })

    public ngOnInit(): void {
        // Coming back from a game keeps the list as it was; the first visit loads the whole catalogue.
        if (!this.pagination()) void this.service.load()
        void this.loadTags()

        this.searchControl.valueChanges
            .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
            .subscribe((value) => void this.service.update({ search: value.trim() || undefined }))
    }

    public setIssue(issue: CatalogueIssue | null): void {
        void this.service.update({ issue: issue ?? undefined })
    }

    public setLength(length: GameLength): void {
        void this.service.update({ length: this.filters().length === length ? undefined : length })
    }

    public setPlayers(value: string): void {
        const players = Number.parseInt(value, 10)
        void this.service.update({ players: players >= 1 && players <= 100 ? players : undefined })
    }

    public setTag(value: string): void {
        const tagId = Number.parseInt(value, 10)
        void this.service.update({ tagIds: Number.isInteger(tagId) ? [tagId] : undefined })
    }

    public clearFilters(): void {
        this.searchControl.setValue('', { emitEvent: false })
        void this.service.load({}, 1)
    }

    public goToPage(page: number): void {
        void this.service.load(this.filters(), page)
    }

    public retry(): void {
        void this.service.load(this.filters(), this.service.page())
    }

    public issueLabel(issue: CatalogueIssue): string {
        return this.issues.find((option) => option.value === issue)?.label ?? issue
    }

    private async loadTags(): Promise<void> {
        try {
            this.catalogueTags.set(await firstValueFrom(this.api.getCatalogueTags()))
        } catch (error) {
            // The tag filter is optional; the rest of the page works without it.
            this.logger.error('Error loading catalogue tags:', error)
        }
    }
}
