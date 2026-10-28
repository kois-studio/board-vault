import { Component, computed, input } from '@angular/core'
import type { MeetType } from '../../api/api.types'
import type { SessionDateParts } from '../../core/utils/sessionTiming'

export type SessionStat = { label: string; value: number }

const STATUS: Record<MeetType['status'], { label: string; description: string; date: string; pill: string }> = {
    scheduled: {
        label: $localize`:Tag on a planned game night, on Upcoming:Planned`,
        description: $localize`:On a planned game night's page, under its title:Answer if you can make it. The organizer starts the night when everyone is at the table.`,
        date: 'bg-bv-primary-soft text-bv-on-primary-soft',
        pill: 'bg-bv-primary-soft text-bv-on-primary-soft',
    },
    active: {
        label: $localize`:Tag on a game night going on now, on Upcoming:Live now`,
        description: $localize`:On the page of a game night going on now, under its title:Mark the games as you play them, who played, and who won.`,
        date: 'bg-bv-success/15 text-bv-success',
        pill: 'bg-bv-success/15 text-bv-success',
    },
    completed: {
        label: $localize`:Tag on a game night that has ended and is recorded:Completed`,
        description: $localize`:On the page of a recorded game night, under its title:Part of the group’s history. You can still record who won each game.`,
        date: 'bg-bv-surface-2 text-bv-text',
        pill: 'bg-bv-surface-2 text-bv-text-muted',
    },
    cancelled: {
        label: $localize`:Tag on a cancelled game night:Cancelled`,
        description: $localize`:On the page of a cancelled game night, under its title:This game night was cancelled. It stays here for reference.`,
        date: 'bg-bv-danger/10 text-bv-danger',
        pill: 'bg-bv-danger/10 text-bv-danger',
    },
}

/** A planned night whose evening is over and nothing is recorded yet: the warning tone, as on Upcoming. */
const AWAITING_RESULTS = {
    label: $localize`:Heading on Upcoming for game nights that are over but have no results yet:Waiting for results`,
    description: $localize`:On the page of a planned game night whose day has passed and nothing is recorded yet, under its title:This night is over. Record who came and what you played, or cancel it if it didn’t happen.`,
    date: 'bg-bv-warning/15 text-bv-warning',
    pill: 'bg-bv-warning/15 text-bv-warning',
}

/**
 * The top of a game night: date, status, group, notes and counts. Presentational: the session
 * page and the landing page's example render it. RSVP and actions are projected below.
 */
@Component({
    selector: 'app-session-summary',
    templateUrl: './session-summary.component.html',
})
export class SessionSummaryComponent {
    readonly status = input.required<MeetType['status']>()
    readonly date = input.required<SessionDateParts>()
    readonly groupName = input.required<string>()
    readonly timezone = input.required<string>()
    /** "in 3 days", shown while the night is planned or live. */
    readonly relativeLabel = input('')
    /** The full date for screen readers, next to the visible time. */
    readonly accessibleDate = input('')
    readonly notes = input<string | null>(null)
    readonly stats = input<Array<SessionStat>>([])
    /** The session page's title is the page heading; elsewhere it sits under a section heading. */
    readonly headingLevel = input<1 | 3>(1)
    /** A planned night that is already over (`wrap-up` in sessionTiming): it waits for results, not answers. */
    readonly awaitingResults = input(false)

    public readonly tone = computed(() =>
        this.awaitingResults() && this.status() === 'scheduled' ? AWAITING_RESULTS : STATUS[this.status()],
    )
    public readonly isUpcoming = computed(() => this.status() === 'scheduled' || this.status() === 'active')
}
