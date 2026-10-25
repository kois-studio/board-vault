import { Component, effect, input, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import type { GroupActivityType } from '../../api/api.types'
import { timeAgo } from '../../core/i18n/format'
import { describeActivity } from '../../core/utils/groupActivity'
import { ButtonComponent } from '../ui/button/button.component'

const PAGE_SIZE = 10

/** Stored times are UTC without a zone ("2026-10-16 18:30:00"). */
function storedTime(value: string): number {
    return new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`).getTime()
}

export type GroupActivityRow = { id: number; text: string; when: string; meetId: number | null }

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
            const page = await firstValueFrom(this.api.getGroupActivity(groupId, { before, limit: PAGE_SIZE }))
            if (groupId !== this.groupId()) return
            this.rows.update((rows) => [...rows, ...page.entries.map((entry) => this.toRow(entry))])
            this.hasMore.set(page.hasMore)
        } catch {
            this.failed.set(true)
        } finally {
            this.loading.set(false)
        }
    }

    private toRow(entry: GroupActivityType): GroupActivityRow {
        return { id: entry.id, text: describeActivity(entry), when: timeAgo(storedTime(entry.createdAt)), meetId: entry.meetId }
    }
}
