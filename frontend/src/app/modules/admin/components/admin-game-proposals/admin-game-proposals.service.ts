import { Injectable, inject, signal } from '@angular/core'
import { Api } from '../../../../api/api'
import type { GameProposalType } from '../../../../api/api.types'
import { LogService } from '../../../../core/services/log.service'
import { LoginService } from '../../../../core/services/login.service'
import { ToastService } from '../../../../components/toast/toast.service'

export type GameProposalWithIdsType = GameProposalType & { submitterId: number; reviewerId?: number }

export type AdminGameProposalsResponseType = {
    proposals: Array<GameProposalWithIdsType>
    pagination: {
        currentPage: number
        totalPages: number
        totalItems: number
        itemsPerPage: number
    }
}

@Injectable()
export class AdminGameProposalsService {
    private readonly api = inject(Api)
    private readonly logger = inject(LogService)
    private readonly toastService = inject(ToastService)
    private readonly loginService = inject(LoginService)

    // --------------------------------------------------------------------------
    //        Component signals
    // --------------------------------------------------------------------------
    public readonly proposals = signal<Array<GameProposalWithIdsType>>([])
    public readonly pagination = signal<AdminGameProposalsResponseType['pagination'] | null>(null)
    public readonly isLoading = signal<boolean>(false)
    public readonly currentStatus = signal<'pending' | 'approved' | 'rejected' | 'duplicate' | null>(null)
    public readonly currentPage = signal<number>(1)
    public readonly itemsPerPage = signal<number>(10)

    // --------------------------------------------------------------------------
    //        Methods
    // --------------------------------------------------------------------------
    public async loadProposals(
        status?: 'pending' | 'approved' | 'rejected' | 'duplicate',
        page: number = 1,
        limit: number = 10
    ): Promise<void> {
        this.isLoading.set(true)
        this.currentStatus.set(status || null)
        this.currentPage.set(page)

        try {
            const response = await this.api.getAdminGameProposals(status, page, limit).toPromise()
            if (response) {
                this.proposals.set(response.proposals)
                this.pagination.set(response.pagination)
            }
        } catch (error) {
            this.logger.error('Error loading game proposals:', error)
            this.toastService.error('Failed to load game proposals')
        } finally {
            this.isLoading.set(false)
        }
    }

    public async approveProposal(
        proposalId: number,
        approvalData: {
            reviewNotes?: string
            imageUrl?: string
            gameAvgDuration?: number
            minPlayers?: number
            maxPlayers?: number
            translations?: Record<string, string>
            tagIds?: number[]
        }
    ): Promise<boolean> {
        const currentUserId = this.loginService.currentUserId()
        if (!currentUserId) {
            this.toastService.error('User not authenticated')
            return false
        }

        try {
            const response = await this.api.approveGameProposal(proposalId, currentUserId, approvalData).toPromise()
            if (response?.success) {
                this.toastService.success('Game proposal approved successfully!')
                await this.loadProposals(this.currentStatus() || undefined, this.currentPage(), this.itemsPerPage())
                return true
            }
            return false
        } catch (error) {
            this.logger.error('Error approving game proposal:', error)
            this.toastService.error('Failed to approve game proposal')
            return false
        }
    }

    public async rejectProposal(proposalId: number, reviewNotes: string): Promise<boolean> {
        const currentUserId = this.loginService.currentUserId()
        if (!currentUserId) {
            this.toastService.error('User not authenticated')
            return false
        }

        try {
            const response = await this.api.rejectGameProposal(proposalId, currentUserId, { reviewNotes }).toPromise()
            if (response?.success) {
                this.toastService.success('Game proposal rejected')
                await this.loadProposals(this.currentStatus() || undefined, this.currentPage(), this.itemsPerPage())
                return true
            }
            return false
        } catch (error) {
            this.logger.error('Error rejecting game proposal:', error)
            this.toastService.error('Failed to reject game proposal')
            return false
        }
    }

    public async markAsDuplicate(proposalId: number, reviewNotes?: string): Promise<boolean> {
        const currentUserId = this.loginService.currentUserId()
        if (!currentUserId) {
            this.toastService.error('User not authenticated')
            return false
        }

        try {
            const response = await this.api.markGameProposalAsDuplicate(proposalId, currentUserId, reviewNotes).toPromise()
            if (response?.success) {
                this.toastService.success('Game proposal marked as duplicate')
                await this.loadProposals(this.currentStatus() || undefined, this.currentPage(), this.itemsPerPage())
                return true
            }
            return false
        } catch (error) {
            this.logger.error('Error marking game proposal as duplicate:', error)
            this.toastService.error('Failed to mark game proposal as duplicate')
            return false
        }
    }

    public async deleteProposal(proposalId: number): Promise<boolean> {
        try {
            const response = await this.api.deleteGameProposal(proposalId).toPromise()
            if (response?.success) {
                this.toastService.success('Game proposal deleted')
                await this.loadProposals(this.currentStatus() || undefined, this.currentPage(), this.itemsPerPage())
                return true
            }
            return false
        } catch (error) {
            this.logger.error('Error deleting game proposal:', error)
            this.toastService.error('Failed to delete game proposal')
            return false
        }
    }

    // --------------------------------------------------------------------------
    //        Helper methods
    // --------------------------------------------------------------------------
    public getStatusBadgeClass(status: GameProposalType['status']): string {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
            case 'approved':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
            case 'rejected':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
            case 'duplicate':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
        }
    }

    public getStatusText(status: GameProposalType['status']): string {
        switch (status) {
            case 'pending':
                return 'Pending'
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
            hour: '2-digit',
            minute: '2-digit',
        })
    }
} 
