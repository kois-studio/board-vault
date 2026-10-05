import { HttpErrorResponse } from '@angular/common/http'
import { Injectable, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../../../api/api'
import type { AdminGameProposalsType, AdminGameProposalType, ApproveGameProposalType, ProposalStatus } from '../../../../api/api.types'
import { ToastService } from '../../../../components/toast/toast.service'
import { LogService } from '../../../../core/services/log.service'
import { PendingProposalsService } from '../../../../core/services/pending-proposals.service'

export type GameProposalWithIdsType = AdminGameProposalType

const PAGE_SIZE = 10

@Injectable()
export class AdminGameProposalsService {
    private readonly api = inject(Api)
    private readonly logger = inject(LogService)
    private readonly toastService = inject(ToastService)
    private readonly pendingProposals = inject(PendingProposalsService)

    // --------------------------------------------------------------------------
    //        Component signals
    // --------------------------------------------------------------------------
    public readonly proposals = signal<Array<GameProposalWithIdsType>>([])
    public readonly pagination = signal<AdminGameProposalsType['pagination'] | null>(null)
    public readonly statusCounts = signal<AdminGameProposalsType['statusCounts'] | null>(null)
    public readonly isLoading = signal<boolean>(false)
    /** The queue is what needs work, so the list opens on Pending. */
    public readonly currentStatus = signal<ProposalStatus | null>('pending')
    public readonly currentPage = signal<number>(1)
    public readonly errorMessage = signal<string | null>(null)

    // --------------------------------------------------------------------------
    //        Methods
    // --------------------------------------------------------------------------
    public async loadProposals(status: ProposalStatus | null, page = 1): Promise<void> {
        this.isLoading.set(true)
        this.errorMessage.set(null)
        this.currentStatus.set(status)
        this.currentPage.set(page)

        try {
            const response = await firstValueFrom(this.api.getAdminGameProposals(status ?? undefined, page, PAGE_SIZE))
            this.proposals.set(response.proposals)
            this.pagination.set(response.pagination)
            this.statusCounts.set(response.statusCounts)
            // The list reloads after every review action, so the admin badges follow it.
            void this.pendingProposals.refresh()
        } catch (error) {
            this.logger.error('Error loading game proposals:', error)
            this.errorMessage.set('Game proposals could not be loaded. Try again.')
        } finally {
            this.isLoading.set(false)
        }
    }

    public async reload(): Promise<void> {
        await this.loadProposals(this.currentStatus(), this.currentPage())
    }

    /** Creates the game with the reviewed values; returns its id, or null when it failed. */
    public async approveProposal(proposalId: number, approvalData: ApproveGameProposalType): Promise<number | null> {
        try {
            const response = await firstValueFrom(this.api.approveGameProposal(proposalId, approvalData))
            void this.pendingProposals.refresh()
            this.toastService.success('Approved. The game is in the catalogue.')
            return response.createdGameId ?? null
        } catch (error) {
            this.logger.error('Error approving game proposal:', error)
            this.toastService.error(this.messageFrom(error, 'The proposal could not be approved. Try again.'))
            return null
        }
    }

    public async rejectProposal(proposalId: number, reviewNotes: string): Promise<boolean> {
        try {
            await firstValueFrom(this.api.rejectGameProposal(proposalId, { reviewNotes }))
            void this.pendingProposals.refresh()
            this.toastService.success('Rejected. The proposer can read your reason.')
            return true
        } catch (error) {
            this.logger.error('Error rejecting game proposal:', error)
            this.toastService.error(this.messageFrom(error, 'The proposal could not be rejected. Try again.'))
            return false
        }
    }

    public async markAsDuplicate(proposalId: number, duplicateOfGameId: number, reviewNotes?: string): Promise<boolean> {
        try {
            await firstValueFrom(this.api.markGameProposalAsDuplicate(proposalId, { duplicateOfGameId, reviewNotes }))
            void this.pendingProposals.refresh()
            this.toastService.success('Marked as a duplicate. The proposer is pointed to the existing game.')
            return true
        } catch (error) {
            this.logger.error('Error marking game proposal as duplicate:', error)
            this.toastService.error(this.messageFrom(error, 'The proposal could not be marked as a duplicate. Try again.'))
            return false
        }
    }

    public async deleteProposal(proposalId: number): Promise<boolean> {
        try {
            await firstValueFrom(this.api.deleteGameProposal(proposalId))
            this.toastService.success('Game proposal deleted')
            await this.reload()
            return true
        } catch (error) {
            this.logger.error('Error deleting game proposal:', error)
            this.toastService.error('Failed to delete game proposal')
            return false
        }
    }

    // --------------------------------------------------------------------------
    //        Helper methods
    // --------------------------------------------------------------------------
    /** A 400 from review explains what is missing; anything else gets the fallback. */
    private messageFrom(error: unknown, fallback: string): string {
        const message = error instanceof HttpErrorResponse && error.status === 400 ? error.error?.message : null
        if (typeof message === 'string') return message
        if (Array.isArray(message) && typeof message[0] === 'string') return message[0]
        return fallback
    }

    public getStatusBadgeClass(status: ProposalStatus): string {
        switch (status) {
            case 'pending':
                return 'bg-bv-warning/10 text-bv-warning'
            case 'approved':
                return 'bg-bv-success/10 text-bv-success'
            case 'rejected':
                return 'bg-bv-danger/10 text-bv-danger'
            default:
                return 'bg-bv-surface-2 text-bv-text'
        }
    }

    public getStatusText(status: ProposalStatus): string {
        return { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', duplicate: 'Duplicate' }[status] ?? 'Unknown'
    }

    public formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }
}
