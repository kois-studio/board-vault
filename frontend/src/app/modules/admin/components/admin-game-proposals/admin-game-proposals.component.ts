import { Component, inject, OnInit, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import type { ProposalStatus } from '../../../../api/api.types'
import { ButtonComponent } from '../../../../components/ui/button/button.component'
import { DialogDirective } from '../../../../components/ui/dialog/dialog.directive'
import { IconComponent } from '../../../../components/ui/icon/icon.component'
import { ImageBackgroundComponent } from '../../../../components/ui/image-background/image-background.component'
import { SpinnerComponent } from '../../../../components/ui/spinner/spinner.component'
import { AdminPageHeaderComponent } from '../admin-page-header/admin-page-header.component'
import { AdminGameProposalsService } from './admin-game-proposals.service'

@Component({
    imports: [
        AdminPageHeaderComponent,
        ButtonComponent,
        ImageBackgroundComponent,
        SpinnerComponent,
        IconComponent,
        DialogDirective,
        RouterLink,
    ],
    providers: [AdminGameProposalsService],
    selector: 'app-admin-game-proposals',
    templateUrl: './admin-game-proposals.component.html',
})
export class AdminGameProposalsComponent implements OnInit {
    private readonly adminGameProposalsService = inject(AdminGameProposalsService)

    // --------------------------------------------------------------------------
    //        Math reference for template
    // --------------------------------------------------------------------------
    protected readonly Math = Math

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
    public readonly pendingDeleteProposalId = signal<number | null>(null)

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

    public async onDeleteProposal(proposalId: number): Promise<void> {
        this.pendingDeleteProposalId.set(proposalId)
    }

    public cancelDeleteProposal(): void {
        this.pendingDeleteProposalId.set(null)
    }

    public async confirmDeleteProposal(): Promise<void> {
        const proposalId = this.pendingDeleteProposalId()
        if (proposalId === null) return

        this.pendingDeleteProposalId.set(null)
        await this.adminGameProposalsService.deleteProposal(proposalId)
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

    public truncateText(text: string, maxLength = 50): string {
        if (!text) return ''
        return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
    }
}
