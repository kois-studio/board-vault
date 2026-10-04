import { Component, inject, OnInit, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import type { GameProposalType } from '../../../../api/api.types'
import { ButtonComponent } from '../../../../components/ui/button/button.component'
import { DialogDirective } from '../../../../components/ui/dialog/dialog.directive'
import { IconComponent } from '../../../../components/ui/icon/icon.component'
import { ImageBackgroundComponent } from '../../../../components/ui/image-background/image-background.component'
import { SpinnerComponent } from '../../../../components/ui/spinner/spinner.component'
import { AdminGameProposalsService } from './admin-game-proposals.service'

@Component({
    imports: [ButtonComponent, FormsModule, ImageBackgroundComponent, SpinnerComponent, IconComponent, DialogDirective],
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
    public readonly pendingDeleteProposalId = signal<number | null>(null)

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
        await this.loadProposals(this.currentStatus() || undefined)
    }

    // --------------------------------------------------------------------------
    //        Helper methods
    // --------------------------------------------------------------------------
    public getStatusBadgeClass(status: GameProposalType['status']): string {
        return this.adminGameProposalsService.getStatusBadgeClass(status)
    }

    public getStatusText(status: GameProposalType['status']): string {
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
