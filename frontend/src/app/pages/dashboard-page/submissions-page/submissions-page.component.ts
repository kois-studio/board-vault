import { Component, inject, ViewChild } from '@angular/core'
import type { GameProposalType } from '../../../api/api.types'
import { ModalGameSubmissionComponent } from '../../../components/modals/modal-game-submission/modal-game-submission.component'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { DataService } from '../../../core/services/data.service'

@Component({
    imports: [PageHeaderComponent, ButtonComponent, ContainerWrapperComponent, ModalGameSubmissionComponent, IconComponent],
    templateUrl: 'submissions-page.component.html',
})
export class SubmissionsPageComponent {
    private readonly dataService = inject(DataService)

    // --------------------------------------------------------------------------
    //        signals
    // --------------------------------------------------------------------------
    public readonly currentUser$ = this.dataService.currentUser
    public readonly userProposals$ = this.dataService.userProposals
    public readonly userProposalStats$ = this.dataService.userProposalStats
    public readonly proposalsLoading = this.dataService.userProposalsLoading
    public readonly proposalsError = this.dataService.userProposalsError
    public readonly proposalStatsLoading = this.dataService.userProposalStatsLoading
    public readonly proposalStatsError = this.dataService.userProposalStatsError

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    @ViewChild(ModalGameSubmissionComponent) modalGameSubmission!: ModalGameSubmissionComponent

    // --------------------------------------------------------------------------
    //        Methods
    // --------------------------------------------------------------------------
    public showSubmissionModal(): void {
        this.modalGameSubmission.showDialog()
    }

    public onProposalSubmitted(): void {
        // Refresh proposals data
        const currentUser = this.currentUser$()
        if (currentUser) {
            this.dataService.refreshUserProposals()
            this.dataService.refreshUserProposalStats()
        }
    }

    public retryProposals(): void {
        this.dataService.refreshUserProposals()
        this.dataService.refreshUserProposalStats()
    }

    public getStatusBadgeClass(status: GameProposalType['status']): string {
        switch (status) {
            case 'pending':
                return 'bg-bv-warning/10 text-bv-warning border-bv-warning/30'
            case 'approved':
                return 'bg-bv-success/10 text-bv-success border-bv-success/30'
            case 'rejected':
                return 'bg-bv-danger/10 text-bv-danger border-bv-danger/30'
            case 'duplicate':
                return 'bg-bv-surface-2 text-bv-text border-bv-border'
            default:
                return 'bg-bv-surface-2 text-bv-text border-bv-border'
        }
    }

    public getStatusText(status: GameProposalType['status']): string {
        switch (status) {
            case 'pending':
                return 'Pending Review'
            case 'approved':
                return 'Approved'
            case 'rejected':
                return 'Rejected'
            case 'duplicate':
                return 'Duplicate'
            default:
                return 'Unknown'
        }
    }

    public formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }
}
