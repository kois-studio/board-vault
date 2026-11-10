import { CurrencyPipe } from '@angular/common'
import { Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import type { GroupStandingType } from '../../api/api.types'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { ImageBackgroundComponent } from '../../components/ui/image-background/image-background.component'
import { ReviewDisplayComponent } from '../../components/ui/review-display/review-display.component'
import { DataService } from '../../core/services/data.service'
import { gameTitle, gameTitleLanguage } from '../../core/utils/gameTitle'

type GroupLine = { id: number; name: string; standing: GroupStandingType | null; failed: boolean }

/**
 * The signed-in person's own page, across all their groups. Only they see it: no privacy settings,
 * nothing here is shown to anyone else. How a group sees them stays on the group person page.
 */
@Component({
    selector: 'app-you-page',
    imports: [
        ButtonComponent,
        ContainerWrapperComponent,
        CurrencyPipe,
        IconComponent,
        ImageBackgroundComponent,
        ImageProfileComponent,
        ReviewDisplayComponent,
        RouterLink,
    ],
    templateUrl: './you-page.component.html',
})
export class YouPageComponent {
    private readonly api = inject(Api)
    private readonly dataService = inject(DataService)

    public readonly user = this.dataService.currentUser
    public readonly title = gameTitle
    public readonly titleLanguage = gameTitleLanguage
    private readonly standings = signal<Record<number, GroupStandingType | null | 'failed'>>({})

    /** Each group with your line in its standings, the same numbers its group page shows. */
    public readonly groups = computed<Array<GroupLine>>(() => {
        const standings = this.standings()
        return this.dataService.userGroups().map((group) => {
            const standing = standings[group.id]
            return {
                id: group.id,
                name: group.name,
                standing: standing === 'failed' ? null : (standing ?? null),
                failed: standing === 'failed',
            }
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
    /** What you entered as paid for your games: private, like the rest of this page. */
    public readonly paid = computed(() => this.dataService.userStats().totalGamesValue)

    /** The games you played most, across every group, with how often you won them: counted by the server (#252). */
    public readonly mostPlayed = computed(() => this.dataService.userHistorySummary()?.myMostPlayed ?? [])
    public readonly topRated = computed(() =>
        [...this.dataService.userReviews()]
            .filter((review) => review.review > 0)
            .sort((a, b) => b.review - a.review)
            .slice(0, 5),
    )
    public readonly ratedCount = computed(() => this.dataService.userReviews().filter((review) => review.review > 0).length)

    /** Your groups did not load: the page cannot know them, so it never says you are in none. */
    public readonly groupsFailed = this.dataService.userGroupsError
    /** The totals add up every group's line, so one group that did not load makes them wrong, not zero. */
    public readonly totalsUnknown = computed(() => this.groupsFailed() || this.groups().some((group) => group.failed))
    public readonly gamesFailed = this.dataService.userGamesError
    public readonly historyFailed = this.dataService.userHistorySummaryError
    public readonly reviewsFailed = this.dataService.userReviewsError
    /**
     * Something on the page did not load: it says so once, and what is missing shows as a dash, never as 0 or
     * "none yet" (#248). Stats alone only feed the "paid" line, which is left out without them, so they do not count.
     */
    public readonly anyFailed = computed(() => this.totalsUnknown() || this.gamesFailed() || this.historyFailed() || this.reviewsFailed())

    constructor() {
        // Groups can arrive after the page opens, as on a link opened directly.
        effect(() => {
            const groups = this.dataService.userGroups()
            untracked(() => void this.loadStandings(groups.map((group) => group.id).filter((id) => !(id in this.standings()))))
        })
    }

    /** Loads again only what failed. */
    public retry(): void {
        if (this.groupsFailed()) this.dataService.refreshUserGroups()
        if (this.gamesFailed()) this.dataService.refreshUserGames()
        if (this.dataService.userStatsError()) this.dataService.refreshUserStats()
        if (this.historyFailed()) this.dataService.refreshUserHistory()
        if (this.reviewsFailed()) this.dataService.refreshGameReviews()

        const failedStandings = Object.entries(this.standings())
            .filter(([, line]) => line === 'failed')
            .map(([groupId]) => Number(groupId))
        if (failedStandings.length > 0) void this.loadStandings(failedStandings)
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
