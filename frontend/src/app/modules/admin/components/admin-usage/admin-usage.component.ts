import { Component, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../../../api/api'
import type { UsageReportType } from '../../../../api/api.types'
import { SpinnerComponent } from '../../../../components/ui/spinner/spinner.component'
import { AdminPageHeaderComponent } from '../admin-page-header/admin-page-header.component'

/** Readable names for the actions the API counts (ADR-0021); unknown ones show as they are. */
const ACTION_LABELS: Record<string, string> = {
    account_created: 'Created an account',
    game_added: 'Added a game to their shelf',
    game_wishlisted: 'Wishlisted a game',
    review_saved: 'Rated a game',
    game_proposed: 'Proposed a game',
    group_created: 'Created a group',
    group_joined: 'Joined a group',
    invite_sent: 'Sent an invitation',
    session_planned: 'Planned a night',
    session_recorded: 'Recorded a past night',
    session_started: 'Started a night',
    session_finished: 'Finished a night',
    session_cancelled: 'Cancelled a night',
    game_suggested: 'Suggested a game for a night',
    game_voted: 'Voted for a game',
    night_answered: 'Answered a night',
    played_games_recorded: 'Recorded games played',
    results_recorded: 'Recorded who won',
    group_person_game_set: "Changed a group person's games",
}

/** Administration → Usage: our own usage statistics, last 30 days (ADR-0021). */
@Component({
    imports: [AdminPageHeaderComponent, SpinnerComponent],
    templateUrl: './admin-usage.component.html',
})
export class AdminUsageComponent {
    private readonly api = inject(Api)

    readonly report = signal<UsageReportType | null>(null)
    readonly loading = signal(true)
    readonly failed = signal(false)

    constructor() {
        void this.load()
    }

    async load(): Promise<void> {
        this.loading.set(true)
        this.failed.set(false)
        try {
            this.report.set(await firstValueFrom(this.api.getAdminUsage()))
        } catch {
            this.failed.set(true)
        } finally {
            this.loading.set(false)
        }
    }

    actionLabel(name: string): string {
        return ACTION_LABELS[name] ?? name
    }

    /** "42%" of the funnel's first step; the first step itself has none. */
    share(people: number, first: number): string {
        return first > 0 ? `${Math.round((people / first) * 100)}%` : '–'
    }
}
