import { fakeDatabase } from '../../../../test/fake-database.js'

import { AdminService } from './admin.service.js'

import type { Mock } from 'vitest'

describe('AdminService', () => {
    describe('approveGameProposal', () => {
        const proposal = { id: 3, title: 'Azul', submittedBy: 7, imageUrl: null, gameAvgDuration: null, minPlayers: null, maxPlayers: null }

        function serviceWith(approveGameProposalAtomically: Mock) {
            const gameProposalService = { getGameProposalById: vi.fn().mockResolvedValue(proposal) }
            const gameTranslationService = { normalizeTitle: (title: string) => title.toLowerCase() }
            const cacheService = { deleteOne: vi.fn().mockResolvedValue(undefined) }

            return new AdminService(
                {} as never,
                {} as never,
                {} as never,
                {} as never,
                gameTranslationService as never,
                gameProposalService as never,
                fakeDatabase({ approveGameProposalAtomically }),
                cacheService as never,
            )
        }

        it('stores no artwork, not a third-party placeholder, when the proposal has no image', async () => {
            const approveGameProposalAtomically = vi.fn().mockResolvedValue({ createdGameId: 40 })

            await serviceWith(approveGameProposalAtomically).approveGameProposal(3, 1, {})

            expect(approveGameProposalAtomically).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: '' }))
        })

        it('keeps the image the reviewer provides', async () => {
            const approveGameProposalAtomically = vi.fn().mockResolvedValue({ createdGameId: 40 })

            await serviceWith(approveGameProposalAtomically).approveGameProposal(3, 1, { imageUrl: 'https://example.test/azul.png' })

            expect(approveGameProposalAtomically).toHaveBeenCalledWith(
                expect.objectContaining({ imageUrl: 'https://example.test/azul.png' }),
            )
        })
    })
})
