import { TestBed } from '@angular/core/testing'
import { of, throwError } from 'rxjs'
import { Api } from '../../api/api'
import { PendingProposalsService } from './pending-proposals.service'

describe('PendingProposalsService', () => {
    const setup = (getAdminGameProposals: ReturnType<typeof vi.fn>) => {
        TestBed.configureTestingModule({ providers: [{ provide: Api, useValue: { getAdminGameProposals } }] })
        return TestBed.inject(PendingProposalsService)
    }

    it('counts pending proposals with a one-item page', async () => {
        const getAdminGameProposals = vi
            .fn()
            .mockReturnValue(of({ proposals: [], pagination: { currentPage: 1, totalPages: 3, totalItems: 3, itemsPerPage: 1 } }))
        const service = setup(getAdminGameProposals)

        await service.refresh()

        expect(getAdminGameProposals).toHaveBeenCalledWith('pending', 1, 1)
        expect(service.count()).toBe(3)
    })

    it('shows no count when the request fails', async () => {
        const service = setup(vi.fn().mockReturnValue(throwError(() => new Error('forbidden'))))

        await service.refresh()

        expect(service.count()).toBeNull()
    })
})
