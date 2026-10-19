import { CurrencyPipe } from '@angular/common'
import { Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import type { GameCompleteType, GroupStandingType } from '../../api/api.types'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { ImageBackgroundComponent } from '../../components/ui/image-background/image-background.component'
import { ReviewDisplayComponent } from '../../components/ui/review-display/review-display.component'
import { CountPipe } from '../../core/pipes/count.pipe'
import { DataService } from '../../core/services/data.service'
import { gameTitle } from '../../core/utils/gameTitle'

type GroupLine = { id: number; name: string; standing: GroupStandingType | null; failed: boolean }

/**
 * The signed-in person's own page, across all their groups. Only they see it: no privacy settings,
 * nothing here is shown to anyone else. How a group sees them stays on the group person page.
 */
@Component({
    selector: 'app-you-page',
    imports: [ContainerWrapperComponent, CountPipe, CurrencyPipe, IconComponent, ImageBackgroundComponent, ImageProfileComponent, ReviewDisplayComponent, RouterLink],
    templateUrl: './you-page.component.html',
})
export class YouPageComponent {
    private readonly api = inject(Api)
    private readonly dataService = inject(DataService)

    public readonly user = this.dataService.currentUser
    public readonly title = gameTitle
    private readonly standings = signal<Record<number, GroupStandingType | null | 'failed'>>({})

    /** Each group with your line in its standings, the same numbers its group page shows. */
    public readonly groups = computed<Array<GroupLine>>(() => {
        const standings = this.standings()
        return this.dataService.userGroups().map((group) => {
            const standing = standings[group.id]
            return { id: group.id, name: group.name, standing: standing === 'failed' ? null : (standing ?? null), failed: standing === 'failed' }
        })
    })
    public readonly totals = computed(() =>
        this.groups().reduce(
            (sum, group) => ({
                nights: sum.nights + (group.standing?.sessions ?? 0),
                plays: sum.plays + (group.standing?.gamesPlayed ?? 0),
                wins: sum.wins + (group.standing?.wins ?? 0),
            }),
            { nights: 0, plays: 0, wins: 0 },
        ),
    )
    public readonly ownedGames = computed(() => this.dataService.userGames().length)
    public readonly worth = computed(() => this.dataService.userStats().totalGamesValue)

    /** The games you played most, across every group, with how often you won them. */
    public readonly mostPlayed = computed(() => {
        const me = this.user()?.id
        const byGame = new Map<number, { game: GameCompleteType; plays: number; wins: number }>()
        for (const record of this.dataService.userHistory()) {
            if (record.meetData.status !== 'completed') continue
            for (const played of record.gamesPlayed) {
                if (!played.playedBy.some((person) => person.id === me)) continue
                const line = byGame.get(played.gameData.id) ?? { game: played.gameData, plays: 0, wins: 0 }
                line.plays += played.playCount ?? 1
                if (me !== undefined && played.winnerAccountIds?.includes(me)) line.wins += 1
                byGame.set(played.gameData.id, line)
            }
        }
        return [...byGame.values()].sort((a, b) => b.plays - a.plays || b.wins - a.wins).slice(0, 5)
    })
    public readonly topRated = computed(() =>
        [...this.dataService.userReviews()].filter((review) => review.review > 0).sort((a, b) => b.review - a.review).slice(0, 5),
    )
    public readonly ratedCount = computed(() => this.dataService.userReviews().filter((review) => review.review > 0).length)

    constructor() {
        // Groups can arrive after the page opens, as on a link opened directly.
        effect(() => {
            const groups = this.dataService.userGroups()
            untracked(() => void this.loadStandings(groups.map((group) => group.id).filter((id) => !(id in this.standings()))))
        })
    }

    private async loadStandings(groupIds: Array<number>): Promise<void> {
        const me = this.user()?.id
        await Promise.all(
            groupIds.map(async (groupId) => {
                let line: GroupStandingType | null | 'failed'
                try {
                    const insights = await firstValueFrom(this.api.getGroupInsights(groupId))
                    line = insights.standings.find((standing) => standing.accountId === me) ?? null
                } catch {
                    line = 'failed'
                }
                this.standings.update((all) => ({ ...all, [groupId]: line }))
            }),
        )
    }
}
