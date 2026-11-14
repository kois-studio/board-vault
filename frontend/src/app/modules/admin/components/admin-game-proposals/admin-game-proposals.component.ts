import { Component, inject, OnInit } from '@angular/core'
import { RouterLink } from '@angular/router'
import type { AdminGameProposalType, ProposalStatus } from '../../../../api/api.types'
import { ButtonComponent } from '../../../../components/ui/button/button.component'
import { SpinnerComponent } from '../../../../components/ui/spinner/spinner.component'
import { AdminPageHeaderComponent } from '../admin-page-header/admin-page-header.component'
import { AdminGameProposalsService } from './admin-game-proposals.service'
@Component({
    imports: [AdminPageHeaderComponent, ButtonComponent, SpinnerComponent, RouterLink],
    providers: [AdminGameProposalsService],
    selector: 'app-admin-game-proposals',
    templateUrl: './admin-game-proposals.component.html',
})
export class AdminGameProposalsComponent implements OnInit {
    private readonly adminGameProposalsService = inject(AdminGameProposalsService)

    // --------------------------------------------------------------------------
    //        Service signals
    // --------------------------------------------------------------------------
    public readonly proposals = this.adminGameProposalsService.proposals
    public readonly pagination = this.adminGameProposalsService.pagination
    public readonly isLoading = this.adminGameProposalsService.isLoading
    public readonly currentStatus = this.adminGameProposalsService.currentStatus
    public readonly currentPage = this.adminGameProposalsService.currentPage
    public readonly errorMessage = this.adminGameProposalsService.errorMessage
    public readonly statusCounts = this.adminGameProposalsService.statusCounts

    // --------------------------------------------------------------------------
    //        Component methods
    // --------------------------------------------------------------------------
    public readonly filters: Array<{ status: ProposalStatus | null; label: string }> = [
        { status: 'pending', label: 'Pending' },
        { status: 'approved', label: 'Approved' },
        { status: 'rejected', label: 'Rejected' },
        { status: 'duplicate', label: 'Duplicate' },
        { status: null, label: 'All' },
    ]

    public ngOnInit(): void {
        void this.adminGameProposalsService.loadProposals('pending')
    }

    public countFor(status: ProposalStatus | null): number | null {
        const counts = this.statusCounts()
        if (!counts) return null
        return status ? counts[status] : counts.pending + counts.approved + counts.rejected + counts.duplicate
    }

    public async onPageChange(page: number): Promise<void> {
        await this.adminGameProposalsService.loadProposals(this.currentStatus(), page)
    }

    public async onStatusFilterChange(status: ProposalStatus | null): Promise<void> {
        await this.adminGameProposalsService.loadProposals(status)
    }

    public async retryProposals(): Promise<void> {
        await this.adminGameProposalsService.reload()
    }

    // --------------------------------------------------------------------------
    //        Helper methods
    // --------------------------------------------------------------------------
    public getStatusBadgeClass(status: ProposalStatus): string {
        return this.adminGameProposalsService.getStatusBadgeClass(status)
    }

    public getStatusText(status: ProposalStatus): string {
        return this.adminGameProposalsService.getStatusText(status)
    }

    public formatDate(dateString: string): string {
        return this.adminGameProposalsService.formatDate(dateString)
    }

    public addToText(addTo: AdminGameProposalType['addTo']): string {
        if (addTo === 'shelf') return 'Owns it'
        if (addTo === 'wishlist') return 'Wants it'
        return 'Catalogue only'
    }
}
