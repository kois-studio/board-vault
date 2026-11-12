import { Component, computed, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../../../api/api'
import type { ProblemReportType, ProblemSummaryType } from '../../../../api/api.types'
import { SpinnerComponent } from '../../../../components/ui/spinner/spinner.component'
import { formatDateTime } from '../../../../core/i18n/format'
import { AdminPageHeaderComponent } from '../admin-page-header/admin-page-header.component'

const KIND_LABELS: Record<ProblemSummaryType['kind'], string> = {
    error: 'Error in the app',
    rejection: 'Unhandled rejection',
    chunk: "Page code didn't load",
    request: 'API call failed',
    exception: 'API exception',
}

/** Administration → Problems: what broke in the app and the API, last 30 days (#247, ADR-0028). */
@Component({
    imports: [AdminPageHeaderComponent, SpinnerComponent],
    templateUrl: './admin-problems.component.html',
})
export class AdminProblemsComponent {
    private readonly api = inject(Api)

    readonly report = signal<ProblemReportType | null>(null)
    readonly loading = signal(true)
    readonly failed = signal(false)
    readonly source = signal<'all' | 'app' | 'api'>('all')

    readonly problems = computed(() => {
        const source = this.source()
        return (this.report()?.problems ?? []).filter((problem) => source === 'all' || problem.source === source)
    })
    readonly total = computed(() => this.problems().reduce((sum, problem) => sum + problem.occurrences, 0))

    constructor() {
        void this.load()
    }

    async load(): Promise<void> {
        this.loading.set(true)
        this.failed.set(false)
        try {
            this.report.set(await firstValueFrom(this.api.getAdminProblems()))
        } catch {
            this.failed.set(true)
        } finally {
            this.loading.set(false)
        }
    }

    kindLabel(kind: ProblemSummaryType['kind']): string {
        return KIND_LABELS[kind] ?? kind
    }

    /** Stored in UTC by the database; shown in the admin's own time. */
    when(stored: string): string {
        return formatDateTime(new Date(`${stored.replace(' ', 'T')}Z`), { dateStyle: 'medium', timeStyle: 'short' })
    }
}
