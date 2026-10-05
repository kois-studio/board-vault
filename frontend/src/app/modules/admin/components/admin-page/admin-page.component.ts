import { Component, computed, inject, OnInit, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../../../api/api'
import type { AdminOverviewType, CatalogueIssue } from '../../../../api/api.types'
import { BadgeComponent } from '../../../../components/ui/badge/badge.component'
import { IconComponent } from '../../../../components/ui/icon/icon.component'
import { SpinnerComponent } from '../../../../components/ui/spinner/spinner.component'
import { LogService } from '../../../../core/services/log.service'
import { CATALOGUE_ISSUES } from '../admin-games-manage/admin-games-manage.component'
import { AdminPageHeaderComponent } from '../admin-page-header/admin-page-header.component'

const DAY_MS = 24 * 60 * 60 * 1000

/** Whole days since a database timestamp (UTC, "YYYY-MM-DD HH:MM:SS"). */
export function daysSince(timestamp: string, now = Date.now()): number {
    const time = Date.parse(timestamp.includes('T') ? timestamp : `${timestamp.replace(' ', 'T')}Z`)
    return Number.isNaN(time) ? 0 : Math.max(0, Math.floor((now - time) / DAY_MS))
}

/** The admin Overview: the work waiting, the catalogue's health, and recent decisions. */
@Component({
    imports: [AdminPageHeaderComponent, BadgeComponent, IconComponent, RouterLink, SpinnerComponent],
    templateUrl: './admin-page.component.html',
})
export class AdminPageComponent implements OnInit {
    private readonly api = inject(Api)
    private readonly logger = inject(LogService)

    public readonly overview = signal<AdminOverviewType | null>(null)
    public readonly isLoading = signal(true)
    public readonly errorMessage = signal<string | null>(null)

    public readonly issueRows = computed(() => {
        const overview = this.overview()
        if (!overview) return []
        return CATALOGUE_ISSUES.map((issue) => ({ ...issue, count: overview.catalogueIssues[issue.value] }))
    })

    public async ngOnInit(): Promise<void> {
        await this.load()
    }

    public async load(): Promise<void> {
        this.isLoading.set(true)
        this.errorMessage.set(null)
        try {
            this.overview.set(await firstValueFrom(this.api.getAdminOverview()))
        } catch (error) {
            this.logger.error('Error loading the admin overview:', error)
            this.errorMessage.set('The overview could not be loaded. Try again.')
        } finally {
            this.isLoading.set(false)
        }
    }

    public oldestText(timestamp: string | null): string {
        if (!timestamp) return ''
        const days = daysSince(timestamp)
        return days === 0 ? 'oldest: today' : `oldest: ${days} ${days === 1 ? 'day' : 'days'}`
    }

    public decisionText(status: AdminOverviewType['recentDecisions'][number]['status']): string {
        return { approved: 'Approved', rejected: 'Rejected', duplicate: 'Duplicate' }[status]
    }

    public decisionTone(status: AdminOverviewType['recentDecisions'][number]['status']) {
        return status === 'approved' ? ('success' as const) : status === 'rejected' ? ('danger' as const) : ('neutral' as const)
    }

    public whenText(timestamp: string): string {
        const days = daysSince(timestamp)
        return days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
    }

    public issueQuery(issue: CatalogueIssue) {
        return { issue }
    }
}
