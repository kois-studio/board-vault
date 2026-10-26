import { Component, computed, inject, input, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import type { GameCompleteType, HistoryRecordType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { HomePreferencesService } from '../../core/services/home-preferences.service'
import { gameTitle } from '../../core/utils/gameTitle'
import { mergeHistoryParticipants } from '../../core/utils/historyParticipants'
import { ToastService } from '../toast/toast.service'
import { IconComponent } from '../ui/icon/icon.component'
import { StarRatingComponent } from '../ui/star-rating/star-rating.component'

/**
 * Under a "Recently played" row on Home: the games of that night you played and have not rated yet,
 * each with stars and a quiet dismiss. Ratings are personal and reused across nights (ADR-0022).
 */
@Component({
    selector: 'app-rating-follow-up',
    imports: [IconComponent, StarRatingComponent],
    host: { class: 'block' },
    template: `@if (pending().length > 0) {
        <ul class="space-y-1 px-3 pb-3" aria-label="Rate what you played" i18n-aria-label="Name of the list on Home, under a played game night, of games you played and have not rated">
            @for (game of pending(); track game.id) {
                <li class="flex min-w-0 items-center gap-2 rounded-lg bg-bv-bg py-1 pl-3 pr-1">
                    <span class="min-w-0 flex-1 truncate text-xs text-bv-text-muted" i18n="Prompt on Home to rate a game you played; the placeholder is the game title">Rate <span class="font-semibold text-bv-text">{{ title(game) }}</span></span>
                    <app-star-rating class="shrink-0" [value]="null" [label]="title(game)" [disabled]="saving().includes(game.id)" (rated)="rate(game.id, $event)" />
                    <button
                        type="button"
                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-bv-text-muted transition hover:bg-bv-surface-2 hover:text-bv-text disabled:opacity-60"
                        [disabled]="home.loading() || home.error() || home.saving()"
                        [attr.aria-label]="dismissLabel(game)"
                        title="Not now"
                        i18n-title="Tooltip of the button on Home that stops asking you to rate a game"
                        (click)="dismiss(game.id)"
                    >
                        <app-icon name="x" [size]="16" aria-hidden="true" />
                    </button>
                </li>
            }
        </ul>
    }`,
})
export class RatingFollowUpComponent {
    private readonly data = inject(DataService)
    readonly home = inject(HomePreferencesService)
    private readonly api = inject(Api)
    private readonly toast = inject(ToastService)

    readonly record = input.required<HistoryRecordType>()
    readonly saving = signal<number[]>([])
    readonly rated = signal<number[]>([])
    readonly title = gameTitle

    dismissLabel(game: GameCompleteType): string {
        return $localize`:Button on Home that stops asking you to rate a game; the placeholder is the game title:Not now: stop asking to rate ${gameTitle(game)}:title:`
    }

    /** Played by you in this night, not rated, not dismissed; at most two so the row stays a row. */
    readonly pending = computed(() => {
        const accountId = this.data.currentUser()?.id
        const rated = new Set([...(this.data.userReviews?.() ?? []).map((review) => review.gameId), ...this.rated()])
        const dismissed = new Set(this.home.preferences().dismissedRatingGameIds)
        const games = new Map<number, GameCompleteType>()
        for (const play of this.record().gamesPlayed) {
            if (rated.has(play.gameData.id) || dismissed.has(play.gameData.id)) continue
            if (mergeHistoryParticipants(play.playedBy, play.playedByPeople).some((person) => person.accountId === accountId))
                games.set(play.gameData.id, play.gameData)
        }
        return [...games.values()].slice(0, 2)
    })

    dismiss(gameId: number): void {
        void this.home.update({ dismissedRatingGameIds: [...this.home.preferences().dismissedRatingGameIds, gameId].slice(-100) })
    }

    async rate(gameId: number, rating: number): Promise<void> {
        const accountId = this.data.currentUser()?.id
        if (!accountId || this.saving().includes(gameId)) return
        this.saving.update((ids) => [...ids, gameId])
        try {
            await firstValueFrom(this.api.saveGameReview(accountId, gameId, rating))
            if (this.data.currentUser()?.id !== accountId) return
            this.rated.update((ids) => [...ids, gameId])
            this.data.refreshGameReviews()
            this.toast.success($localize`:Toast after rating a game:Your rating was saved.`)
        } catch {
            this.toast.error($localize`:Toast when a rating could not be saved:Could not save your rating. Try again.`)
        } finally {
            this.saving.update((ids) => ids.filter((id) => id !== gameId))
        }
    }
}
