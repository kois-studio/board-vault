import { Component, ViewChild, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import type { GameProposalType } from '../../../api/api.types'
import { ModalGameSubmissionComponent } from '../../../components/modals/modal-game-submission/modal-game-submission.component'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { DataService } from '../../../core/services/data.service'

@Component({
    imports: [PageHeaderComponent, ButtonComponent, ContainerWrapperComponent, ModalGameSubmissionComponent],
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
            this.dataService['_getUserProposals'](currentUser.id)
            this.dataService['_getUserProposalStats'](currentUser.id)
        }
    }

    public getStatusBadgeClass(status: GameProposalType['status']): string {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200'
            case 'approved':
                return 'bg-green-100 text-green-800 border-green-200'
            case 'rejected':
                return 'bg-red-100 text-red-800 border-red-200'
            case 'duplicate':
                return 'bg-gray-100 text-gray-800 border-gray-200'
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200'
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
