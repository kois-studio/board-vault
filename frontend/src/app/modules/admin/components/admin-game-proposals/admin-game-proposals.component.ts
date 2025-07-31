import { CommonModule } from '@angular/common'
import { Component, OnInit, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ButtonComponent } from '../../../../components/ui/button/button.component'
import { SpinnerComponent } from '../../../../components/ui/spinner/spinner.component'
import { AdminGameProposalsService } from './admin-game-proposals.service'

@Component({
    imports: [CommonModule, FormsModule, ButtonComponent, SpinnerComponent],
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

    // --------------------------------------------------------------------------
    //        Component methods
    // --------------------------------------------------------------------------
    public ngOnInit(): void {
        this.loadProposals()
    }

    public async loadProposals(status?: 'pending' | 'approved' | 'rejected' | 'duplicate'): Promise<void> {
        await this.adminGameProposalsService.loadProposals(status, 1, 10)
    }

    public async onPageChange(page: number): Promise<void> {
        await this.adminGameProposalsService.loadProposals(this.currentStatus() || undefined, page, 10)
    }

    public async onStatusFilterChange(status: 'pending' | 'approved' | 'rejected' | 'duplicate' | null): Promise<void> {
        await this.loadProposals(status || undefined)
    }

    public async onApproveProposal(proposalId: number): Promise<void> {
        // For now, we'll use minimal approval data
        // In the future, this could open a modal for more detailed approval
        await this.adminGameProposalsService.approveProposal(proposalId, {
            reviewNotes: 'Approved by admin',
        })
    }

    public async onRejectProposal(proposalId: number): Promise<void> {
        // For now, we'll use a default rejection message
        // In the future, this could open a modal for rejection notes
        await this.adminGameProposalsService.rejectProposal(proposalId, 'Rejected by admin')
    }

    public async onMarkAsDuplicate(proposalId: number): Promise<void> {
        await this.adminGameProposalsService.markAsDuplicate(proposalId, 'Marked as duplicate')
    }

    public async onDeleteProposal(proposalId: number): Promise<void> {
        if (confirm('Are you sure you want to delete this proposal? This action cannot be undone.')) {
            await this.adminGameProposalsService.deleteProposal(proposalId)
        }
    }

    // --------------------------------------------------------------------------
    //        Helper methods
    // --------------------------------------------------------------------------
    public getStatusBadgeClass(status: string): string {
        return this.adminGameProposalsService.getStatusBadgeClass(status as any)
    }

    public getStatusText(status: string): string {
        return this.adminGameProposalsService.getStatusText(status as any)
    }

    public formatDate(dateString: string): string {
        return this.adminGameProposalsService.formatDate(dateString)
    }

    public truncateText(text: string, maxLength = 50): string {
        if (!text) return ''
        return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
    }
}
