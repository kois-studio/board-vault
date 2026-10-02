import { Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import type { MeetType } from '../../../api/api.types'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { CustomDatePipe } from '../../../core/pipes/customDate.pipe'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'
import { relativeDay, sessionDateParts, type UpcomingState, upcomingState } from '../../../core/utils/sessionTiming'

type UpcomingSection = { state: UpcomingState; title: string; hint: string; sessions: Array<MeetType> }

/** Row colours per state: waiting for results (warning), live (success), planned (primary). */
const STATE_STYLES: Record<UpcomingState, { row: string; date: string; pill: string; action: string }> = {
    'wrap-up': {
        row: 'border-bv-warning/40 hover:border-bv-warning',
        date: 'bg-bv-warning/15 text-bv-warning',
        pill: 'bg-bv-warning/15 text-bv-warning',
        action: 'Record results',
    },
    live: {
        row: 'border-bv-success/40 hover:border-bv-success',
        date: 'bg-bv-success/15 text-bv-success',
        pill: 'bg-bv-success/15 text-bv-success',
        action: 'Live now',
    },
    planned: {
        row: 'border-bv-border hover:border-bv-primary/50',
        date: 'bg-bv-primary-soft text-bv-on-primary-soft',
        pill: 'bg-bv-primary-soft text-bv-on-primary-soft',
        action: 'Planned',
    },
}

@Component({
    imports: [RouterLink, ContainerWrapperComponent, CustomDatePipe, PageHeaderComponent, ButtonComponent, IconComponent],
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
        const byState: Record<UpcomingState, Array<MeetType>> = { 'wrap-up': [], live: [], planned: [] }
        const sorted = [...this.userMeets$()].sort((a, b) => new Date(a.meetDate).getTime() - new Date(b.meetDate).getTime())
        for (const meet of sorted) {
            const state = upcomingState(meet)
            if (state) byState[state].push(meet)
        }

        const sections: Array<UpcomingSection> = [
            { state: 'wrap-up', title: 'Waiting for results', hint: 'Record who came and what you played', sessions: byState['wrap-up'] },
            { state: 'live', title: 'Live now', hint: 'Happening right now', sessions: byState.live },
            { state: 'planned', title: 'Coming up', hint: this.countLabel(byState.planned.length, 'session'), sessions: byState.planned },
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
        return this.userGroups$().find((group) => group.id === groupId)?.name ?? `Group ${groupId}`
    }

    public getGroupContext(groupId: number): string {
        const group = this.userGroups$().find((candidate) => candidate.id === groupId)
        if (!group) return ''

        const gameIds = new Set(group.members.flatMap((member) => member.games.map((game) => game.id)))
        for (const person of group.placeholders ?? []) for (const gameId of person.gameIds) gameIds.add(gameId)
        const people = group.members.length + (group.placeholders?.length ?? 0)
        return `${this.countLabel(people, 'person', 'people')} · ${this.countLabel(gameIds.size, 'game')}`
    }

    private countLabel(count: number, noun: string, plural = `${noun}s`): string {
        return `${count} ${count === 1 ? noun : plural}`
    }

    public retrySessions(): void {
        this.dataService.refreshUserMeets()
    }

    public retryGroups(): void {
        this.dataService.refreshUserGroups()
    }
}
