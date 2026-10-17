import { Component, computed, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import type { GameCompleteType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { HomePreferencesService } from '../../core/services/home-preferences.service'
import { gameTitle } from '../../core/utils/gameTitle'
import { mergeHistoryParticipants } from '../../core/utils/historyParticipants'
import { ToastService } from '../toast/toast.service'
import { StarRatingComponent } from '../ui/star-rating/star-rating.component'

@Component({
    selector: 'app-rating-follow-up',
    imports: [RouterLink, StarRatingComponent],
    template: `@if (pending().length > 0) {
        <section aria-labelledby="home-ratings-heading">
            <h2 id="home-ratings-heading" class="text-lg font-bold">How were these games?</h2>
            <p class="mt-1 text-sm text-bv-text-muted">Games you played and haven’t rated. These are your own ratings.</p>
            <ul class="mt-3 divide-y divide-bv-border rounded-xl border border-bv-border bg-bv-surface">
                @for (game of pending(); track game.id) {
                    <li class="flex flex-wrap items-center gap-3 p-3">
                        <a class="min-w-0 flex-1 font-medium text-bv-primary underline" [routerLink]="['/games', game.id]">{{ title(game) }}</a>
                        <app-star-rating [value]="null" [label]="title(game)" [disabled]="saving().includes(game.id)" (rated)="rate(game.id, $event)" />
                        <button type="button" class="min-h-11 text-sm text-bv-text-muted underline" [disabled]="home.loading() || home.error() || home.saving()" [attr.aria-label]="'Dismiss rating reminder for ' + title(game)" (click)="dismiss(game.id)">Not now</button>
                    </li>
                }
            </ul>
        </section>
    }`,
})
export class RatingFollowUpComponent {
    private readonly data = inject(DataService)
    readonly home = inject(HomePreferencesService)
    private readonly api = inject(Api)
    private readonly toast = inject(ToastService)
    readonly saving = signal<number[]>([])
    readonly rated = signal<number[]>([])
    readonly title = gameTitle
    readonly pending = computed(() => {
        const accountId = this.data.currentUser()?.id
        const rated = new Set([...(this.data.userReviews?.() ?? []).map((review) => review.gameId), ...this.rated()])
        const dismissed = new Set(this.home.preferences().dismissedRatingGameIds)
        const games = new Map<number, GameCompleteType>()
        for (const session of [...this.data.userHistory()].sort(
            (a, b) => Date.parse(b.meetData.meetDate) - Date.parse(a.meetData.meetDate),
        )) {
            for (const play of session.gamesPlayed) {
                if (
                    !rated.has(play.gameData.id) &&
                    !dismissed.has(play.gameData.id) &&
                    mergeHistoryParticipants(play.playedBy, play.playedByPeople).some((person) => person.accountId === accountId)
                )
                    games.set(play.gameData.id, play.gameData)
            }
        }
        return [...games.values()].slice(0, 3)
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
            this.toast.success('Your rating was saved.')
        } catch {
            this.toast.error('Could not save your rating. Try again.')
        } finally {
            this.saving.update((ids) => ids.filter((id) => id !== gameId))
        }
    }
}
