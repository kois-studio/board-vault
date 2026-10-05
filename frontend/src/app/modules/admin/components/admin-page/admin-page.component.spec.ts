import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { of } from 'rxjs'
import { Api } from '../../../../api/api'
import type { AdminOverviewType } from '../../../../api/api.types'
import { LogService } from '../../../../core/services/log.service'
import { AdminPageComponent, daysSince } from './admin-page.component'

describe('AdminPageComponent', () => {
    const overview: AdminOverviewType = {
        proposals: { pending: 0, oldestPendingAt: null },
        catalogueIssues: { 'no-title': 0, 'no-artwork': 4, 'no-spanish': 0, 'no-tags': 2, 'guessed-values': 0 },
        tags: { unused: 0, emptyCategories: 0 },
        catalogue: { games: 65, approvedLast30Days: 3, mostOwned: [{ gameId: 4, title: 'Azul', count: 6 }], mostWantedUnowned: [] },
        recentDecisions: [
            {
                proposalId: 9,
                title: 'Monopoly',
                status: 'rejected',
                reviewedAt: '2026-10-04 10:00:00',
                reviewerName: 'Admin',
                createdGameId: null,
            },
        ],
    }

    const render = async () => {
        TestBed.configureTestingModule({
            imports: [AdminPageComponent],
            providers: [
                provideRouter([]),
                { provide: Api, useValue: { getAdminOverview: vi.fn().mockReturnValue(of(overview)) } },
                { provide: LogService, useValue: { error: vi.fn() } },
            ],
        })
        const fixture = TestBed.createComponent(AdminPageComponent)
        await fixture.componentInstance.ngOnInit()
        fixture.detectChanges()
        return fixture.nativeElement as HTMLElement
    }

    it('reads empty queues as good news and links each catalogue problem to its filtered list', async () => {
        const element = await render()

        expect(element.textContent).toContain('Nothing waiting.')
        expect(element.textContent).toContain('Every tag is in use.')
        expect(element.querySelector('a[href="/admin/manage-games?issue=no-artwork"]')?.textContent).toContain('4')
        expect(element.querySelector('a[href="/admin/manage-games?issue=no-tags"]')?.textContent).toContain('2')
        expect(element.querySelector('a[href="/admin/proposals/9"]')?.textContent).toContain('Monopoly')
        expect(element.textContent).not.toContain('metrics')
    })

    it('counts whole days since a database timestamp', () => {
        expect(daysSince('2026-10-01 10:00:00', Date.parse('2026-10-05T12:00:00Z'))).toBe(4)
        expect(daysSince('2026-10-05 11:00:00', Date.parse('2026-10-05T12:00:00Z'))).toBe(0)
    })
})
