import { HttpErrorResponse } from '@angular/common/http'
import { Component, inject, OnInit, signal } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../../../api/api'
import type { AdminGameType } from '../../../../api/api.types'
import { ToastService } from '../../../../components/toast/toast.service'
import { ButtonComponent } from '../../../../components/ui/button/button.component'
import { IconComponent } from '../../../../components/ui/icon/icon.component'
import { SpinnerComponent } from '../../../../components/ui/spinner/spinner.component'
import { LogService } from '../../../../core/services/log.service'
import {
    AdminGameFieldsComponent,
    createGameFieldsForm,
    groupTags,
    playersOutOfOrder,
    retailPriceValue,
    type TagGroup,
} from '../admin-game-fields/admin-game-fields.component'
import { CATALOGUE_ISSUES } from '../admin-games-manage/admin-games-manage.component'
import { AdminGamesManageService } from '../admin-games-manage/admin-games-manage.service'
import { AdminPageHeaderComponent } from '../admin-page-header/admin-page-header.component'

/** The API refuses uploads above 4 MB (Vercel's limit is 4.5 MB). */
const ARTWORK_UPLOAD_LIMIT = 4 * 1024 * 1024

/** One catalogue game, edited in one form and saved together. */
@Component({
    selector: 'app-admin-game-edit',
    imports: [
        AdminGameFieldsComponent,
        AdminPageHeaderComponent,
        ButtonComponent,
        IconComponent,
        ReactiveFormsModule,
        RouterLink,
        SpinnerComponent,
    ],
    templateUrl: './admin-game-edit.component.html',
})
export class AdminGameEditComponent implements OnInit {
    private readonly api = inject(Api)
    private readonly route = inject(ActivatedRoute)
    private readonly logger = inject(LogService)
    private readonly toastService = inject(ToastService)
    private readonly gamesList = inject(AdminGamesManageService)

    public readonly game = signal<AdminGameType | null>(null)
    public readonly isLoading = signal(true)
    public readonly loadError = signal<string | null>(null)
    public readonly isSaving = signal(false)
    public readonly isUploading = signal(false)
    public readonly tagGroups = signal<Array<TagGroup>>([])
    public readonly selectedTagIds = signal<ReadonlySet<number>>(new Set())
    public readonly form = createGameFieldsForm()

    public async ngOnInit(): Promise<void> {
        const gameId = Number.parseInt(this.route.snapshot.paramMap.get('id') || '', 10)
        try {
            const [game, tags, categories] = await Promise.all([
                firstValueFrom(this.api.getAdminGame(gameId)),
                firstValueFrom(this.api.getAdminTags()),
                firstValueFrom(this.api.getAdminTagCategories()),
            ])
            this.show(game)
            this.tagGroups.set(groupTags(tags, categories))
        } catch (error) {
            this.logger.error('Error loading the game:', error)
            this.loadError.set('This game could not be loaded.')
        } finally {
            this.isLoading.set(false)
        }
    }

    public get playersOutOfOrder(): boolean {
        return playersOutOfOrder(this.form)
    }

    public issueText(issue: AdminGameType['issues'][number]): string {
        const known = CATALOGUE_ISSUES.find((option) => option.value === issue)
        return known ? `${known.label}: ${known.hint}` : issue
    }

    public async save(): Promise<void> {
        const game = this.game()
        this.form.markAllAsTouched()
        if (!game || this.form.invalid || this.playersOutOfOrder) return

        const value = this.form.getRawValue()
        this.isSaving.set(true)
        try {
            const saved = await firstValueFrom(
                this.api.updateAdminGame(game.id, {
                    translations: { en: value.titleEn.trim(), es: value.titleEs.trim() },
                    imageUrl: value.imageUrl.trim(),
                    minPlayers: value.minPlayers ?? undefined,
                    maxPlayers: value.maxPlayers ?? undefined,
                    gameAvgDuration: value.gameAvgDuration ?? undefined,
                    retailPrice: retailPriceValue(this.form),
                    tagIds: [...this.selectedTagIds()],
                }),
            )
            this.show(saved)
            // The list shows this game's row again when the admin goes back.
            void this.gamesList.load(this.gamesList.filters(), this.gamesList.page())
            this.toastService.success('Saved.')
        } catch (error) {
            this.logger.error('Error saving the game:', error)
            const message = error instanceof HttpErrorResponse && error.status === 400 ? error.error?.message : null
            this.toastService.error(typeof message === 'string' ? message : 'The game could not be saved. Try again.')
        } finally {
            this.isSaving.set(false)
        }
    }

    /** The site an artwork was copied from, to name it briefly. */
    public sourceHost(source: string): string {
        try {
            return new URL(source).hostname.replace(/^www\./, '')
        } catch {
            return source
        }
    }

    /** Replaces the artwork with the chosen file right away; the other fields keep their unsaved edits. */
    public async uploadArtwork(input: HTMLInputElement): Promise<void> {
        const game = this.game()
        const file = input.files?.[0]
        input.value = ''
        if (!game || !file) return
        if (file.size > ARTWORK_UPLOAD_LIMIT) {
            this.toastService.error('Choose an image under 4 MB.')
            return
        }

        this.isUploading.set(true)
        try {
            const saved = await firstValueFrom(this.api.uploadGameArtwork(game.id, file))
            this.game.set(saved)
            this.form.controls.imageUrl.reset(saved.imageUrl)
            this.toastService.success('Artwork updated.')
        } catch (error) {
            this.logger.error('Error uploading the artwork:', error)
            const message = error instanceof HttpErrorResponse && error.status === 400 ? error.error?.message : null
            this.toastService.error(typeof message === 'string' ? message : 'The image could not be uploaded. Try again.')
        } finally {
            this.isUploading.set(false)
        }
    }

    private show(game: AdminGameType): void {
        this.game.set(game)
        this.selectedTagIds.set(new Set(game.tags.map((tag) => tag.id)))
        this.form.reset({
            titleEn: game.translations.en,
            titleEs: game.translations.es,
            imageUrl: game.imageUrl,
            minPlayers: game.minPlayers,
            maxPlayers: game.maxPlayers,
            gameAvgDuration: game.gameAvgDuration,
            retailPrice: game.retailPrice,
        })
    }
}
