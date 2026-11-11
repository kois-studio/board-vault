import { Component, effect, input, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import type { GroupActivityType, GroupPersonTakeoverType } from '../../api/api.types'
import { timeAgo } from '../../core/i18n/format'
import { describeActivity } from '../../core/utils/groupActivity'
import { ButtonComponent } from '../ui/button/button.component'

const PAGE_SIZE = 10

/** Stored times are UTC without a zone ("2026-10-16 18:30:00"). */
function storedTime(value: string): number {
    return new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`).getTime()
}

/**
 * `takeoverAccountId`: while a "took over" entry can still be undone (ADR-0027), the member who took the person over.
 * Their page (`members/:accountId`, as for any member) is where the undo is.
 */
export type GroupActivityRow = { id: number; text: string; when: string; meetId: number | null; takeoverAccountId: number | null }

/**
 * The group history (ADR-0020): who changed what, newest first, ten at a time. Read-only: a
 * mistake is fixed by changing it back, which shows up here too.
 */
@Component({
    selector: 'app-group-activity-feed',
    imports: [ButtonComponent, RouterLink],
    templateUrl: './group-activity-feed.component.html',
})
export class GroupActivityFeedComponent {
    readonly groupId = input.required<number>()

    readonly rows = signal<Array<GroupActivityRow>>([])
    readonly hasMore = signal(false)
    readonly loading = signal(true)
    readonly failed = signal(false)
    /** Takeovers that can still be undone: their entries link to the person's page, where the undo is. */
    private takeovers: Array<GroupPersonTakeoverType> = []

    constructor(private readonly api: Api) {
        effect(() => {
            const groupId = this.groupId()
            this.rows.set([])
            void this.load(groupId)
        })
    }

    public showOlder(): void {
        const last = this.rows().at(-1)
        if (last) void this.load(this.groupId(), last.id)
    }

    public retry(): void {
        void this.load(this.groupId(), this.rows().at(-1)?.id)
    }

    private async load(groupId: number, before?: number): Promise<void> {
        this.loading.set(true)
        this.failed.set(false)
        try {
            const [page, takeovers] = await Promise.all([
                firstValueFrom(this.api.getGroupActivity(groupId, { before, limit: PAGE_SIZE })),
                // A detail of the history: without it, entries just have no Undo link.
                before === undefined ? firstValueFrom(this.api.getGroupPersonTakeovers(groupId)).catch(() => []) : this.takeovers,
            ])
            if (groupId !== this.groupId()) return
            this.takeovers = takeovers
            this.rows.update((rows) => [...rows, ...page.entries.map((entry) => this.toRow(entry))])
            this.hasMore.set(page.hasMore)
        } catch {
            this.failed.set(true)
        } finally {
            this.loading.set(false)
        }
    }

    private toRow(entry: GroupActivityType): GroupActivityRow {
        const takeover =
            entry.type === 'person_claimed' && entry.person
                ? this.takeovers.find(
                      (open) => open.groupPersonId === entry.person?.id && storedTime(entry.createdAt) >= storedTime(open.takenAt),
                  )
                : undefined
        return {
            id: entry.id,
            text: describeActivity(entry, { previousName: takeover?.previousName }),
            when: timeAgo(storedTime(entry.createdAt)),
            meetId: entry.meetId,
            takeoverAccountId: takeover?.accountId ?? null,
        }
    }
}
