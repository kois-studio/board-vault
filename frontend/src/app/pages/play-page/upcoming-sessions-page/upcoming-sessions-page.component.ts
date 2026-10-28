import { Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import type { AccountMeetType } from '../../../api/api.types'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { intlLocale } from '../../../core/i18n/format'
import { CustomDatePipe } from '../../../core/pipes/customDate.pipe'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'
import { relativeDay, sessionDateParts, type UpcomingState, upcomingState } from '../../../core/utils/sessionTiming'

type UpcomingSection = { state: UpcomingState; title: string; hint: string; sessions: Array<AccountMeetType> }

/** Row colours per state: waiting for results (warning), live (success), planned (primary). */
const STATE_STYLES: Record<UpcomingState, { row: string; date: string; pill: string; action: string }> = {
    'wrap-up': {
        row: 'border-bv-warning/40 hover:border-bv-warning',
        date: 'bg-bv-warning/15 text-bv-warning',
        pill: 'bg-bv-warning/15 text-bv-warning',
        action: $localize`:Tag on a game night that is over but has no results yet, on Upcoming:Record results`,
    },
    live: {
        row: 'border-bv-success/40 hover:border-bv-success',
        date: 'bg-bv-success/15 text-bv-success',
        pill: 'bg-bv-success/15 text-bv-success',
        action: $localize`:Tag on a game night going on now, on Upcoming:Live now`,
    },
    planned: {
        row: 'border-bv-border hover:border-bv-primary/50',
        date: 'bg-bv-primary-soft text-bv-on-primary-soft',
        pill: 'bg-bv-primary-soft text-bv-on-primary-soft',
        action: $localize`:Tag on a planned game night, on Upcoming:Planned`,
    },
}

import { SessionAnswerComponent } from '../../../components/session-answer/session-answer.component'

@Component({
    imports: [
        SessionAnswerComponent,
        RouterLink,
        ContainerWrapperComponent,
        CustomDatePipe,
        PageHeaderComponent,
        ButtonComponent,
        IconComponent,
    ],
    templateUrl: 'upcoming-sessions-page.component.html',
})
export class UpcomingSessionsPageComponent {
    private readonly dataService = inject(DataService)
    private readonly loadingService = inject(LoadingService)
    private readonly route = inject(ActivatedRoute)
    private readonly router = inject(Router)

    protected readonly STATE_STYLES = STATE_STYLES

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly userGroups$ = this.dataService.userGroups
    public readonly groupsError = this.dataService.userGroupsError
    public readonly userMeets$ = this.dataService.userMeets
    // loadingService
    public readonly isLoadingGroups = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_GROUPS])
    public readonly isLoadingMeets = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_MEETS])
    public readonly meetsError = this.dataService.userMeetsError

    // --------------------------------------------------------------------------
    //        Computed
    // --------------------------------------------------------------------------
    /** With a single group there is nothing to choose: "Plan a session" goes straight to it. */
    public readonly onlyGroup = computed(() => {
        const groups = this.userGroups$()
        return groups.length === 1 ? groups[0] : null
    })

    public readonly sections = computed((): Array<UpcomingSection> => {
        const byState: Record<UpcomingState, Array<AccountMeetType>> = { 'wrap-up': [], live: [], planned: [] }
        const sorted = [...this.userMeets$()].sort((a, b) => new Date(a.meetDate).getTime() - new Date(b.meetDate).getTime())
        for (const meet of sorted) {
            const state = upcomingState(meet)
            if (state) byState[state].push(meet)
        }

        const sections: Array<UpcomingSection> = [
            {
                state: 'wrap-up',
                title: $localize`:Heading on Upcoming for game nights that are over but have no results yet:Waiting for results`,
                hint: $localize`:Hint next to Waiting for results on Upcoming:Record who came and what you played`,
                sessions: byState['wrap-up'],
            },
            {
                state: 'live',
                title: $localize`:Heading on Upcoming for game nights going on now:Live now`,
                hint: $localize`:Hint next to Live now on Upcoming:Happening right now`,
                sessions: byState.live,
            },
            {
                state: 'planned',
                title: $localize`:Heading on Upcoming for planned game nights:Coming up`,
                hint: this.sessionsLabel(byState.planned.length),
                sessions: byState.planned,
            },
        ]
        return sections.filter((section) => section.sessions.length > 0)
    })

    public readonly isSchedulingASession = signal(false)
    public readonly relativeDay = relativeDay
    public readonly dateParts = sessionDateParts

    constructor() {
        // "Plan a session" elsewhere links here with ?plan=1: open the group choice, or go
        // straight to the only group.
        effect(() => {
            if (this.route.snapshot.queryParamMap.get('plan') !== '1' || this.isLoadingGroups()) return
            const group = this.onlyGroup()
            untracked(() => {
                if (group) void this.router.navigate(['/groups', group.id, 'sessions', 'new'], { replaceUrl: true })
                else this.isSchedulingASession.set(true)
            })
        })
    }

    public getGroupName(groupId: number): string {
        return (
            this.userGroups$().find((group) => group.id === groupId)?.name ??
            $localize`:Stands for the name of a group you are no longer in; the placeholder is its number:Group ${groupId}:id:`
        )
    }

    /** How many people and games a group has, for the group choice when planning. */
    public getGroupContext(groupId: number): { people: number; games: number } | null {
        const group = this.userGroups$().find((candidate) => candidate.id === groupId)
        if (!group) return null

        const gameIds = new Set(group.members.flatMap((member) => member.games.map((game) => game.id)))
        for (const person of group.placeholders ?? []) for (const gameId of person.gameIds) gameIds.add(gameId)
        return { people: group.members.length + (group.placeholders?.length ?? 0), games: gameIds.size }
    }

    /** "1 session", "3 sessions": the hint next to Coming up. */
    private sessionsLabel(count: number): string {
        return new Intl.PluralRules(intlLocale()).select(count) === 'one'
            ? $localize`:upcoming sessions hint, one|Hint next to Coming up on Upcoming, counting game nights, one:${count}:count: session`
            : $localize`:upcoming sessions hint, other|Hint next to Coming up on Upcoming, counting game nights, more than one:${count}:count: sessions`
    }

    public retrySessions(): void {
        this.dataService.refreshUserMeets()
    }

    public retryGroups(): void {
        this.dataService.refreshUserGroups()
    }
}
