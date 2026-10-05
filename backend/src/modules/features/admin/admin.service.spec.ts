import { fakeDatabase } from '../../../../test/fake-database.js'

import { AdminService } from './admin.service.js'

import type { Mock } from 'vitest'

describe('AdminService', () => {
    describe('approveGameProposal', () => {
        const proposal = { id: 3, title: 'Azul', submittedBy: 7, imageUrl: null, gameAvgDuration: null, minPlayers: null, maxPlayers: null }

        // The proposal has no players or length, so the reviewer must supply them.
        const reviewed = { minPlayers: 2, maxPlayers: 4, gameAvgDuration: 45 }

        function serviceWith(approveGameProposalAtomically: Mock) {
            const gameProposalService = { getGameProposalById: vi.fn().mockResolvedValue(proposal) }
            const gameTranslationService = { normalizeTitle: (title: string) => title.toLowerCase() }
            const cacheService = { deleteOne: vi.fn().mockResolvedValue(undefined) }
            const tagService = { getTags: vi.fn().mockResolvedValue([{ id: 5 }, { id: 6 }]) }

            return new AdminService(
                tagService as never,
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

            await serviceWith(approveGameProposalAtomically).approveGameProposal(3, 1, reviewed)

            expect(approveGameProposalAtomically).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: '' }))
        })

        it('keeps the image the reviewer provides', async () => {
            const approveGameProposalAtomically = vi.fn().mockResolvedValue({ createdGameId: 40 })

            await serviceWith(approveGameProposalAtomically).approveGameProposal(3, 1, {
                ...reviewed,
                imageUrl: 'https://example.test/azul.png',
            })

            expect(approveGameProposalAtomically).toHaveBeenCalledWith(
                expect.objectContaining({ imageUrl: 'https://example.test/azul.png' }),
            )
        })

        it('refuses to invent players or length the proposal does not have', async () => {
            const approveGameProposalAtomically = vi.fn()

            await expect(serviceWith(approveGameProposalAtomically).approveGameProposal(3, 1, { minPlayers: 2 })).rejects.toThrow(
                'The proposal has no gameAvgDuration, maxPlayers; set them to approve it.',
            )
            expect(approveGameProposalAtomically).not.toHaveBeenCalled()
        })

        it('rejects more minimum than maximum players', async () => {
            await expect(serviceWith(vi.fn()).approveGameProposal(3, 1, { ...reviewed, minPlayers: 5, maxPlayers: 4 })).rejects.toThrow(
                'minPlayers cannot be greater than maxPlayers.',
            )
        })

        it('rejects tag ids that do not exist', async () => {
            await expect(serviceWith(vi.fn()).approveGameProposal(3, 1, { ...reviewed, tagIds: [5, 99] })).rejects.toThrow(
                'Unknown tag ids: 99.',
            )
        })

        it('creates the game with exactly the reviewed values, titles and tags', async () => {
            const approveGameProposalAtomically = vi.fn().mockResolvedValue({ createdGameId: 40 })

            await serviceWith(approveGameProposalAtomically).approveGameProposal(3, 1, {
                ...reviewed,
                translations: { en: '  ', es: 'Azul (ES)' },
                tagIds: [5, 6, 5],
            })

            expect(approveGameProposalAtomically).toHaveBeenCalledWith(
                expect.objectContaining({
                    minPlayers: 2,
                    maxPlayers: 4,
                    gameAvgDuration: 45,
                    tagIds: [5, 6],
                    translations: [
                        { languageCode: 'en', title: 'Azul', normalizedTitle: 'azul' },
                        { languageCode: 'es', title: 'Azul (ES)', normalizedTitle: 'azul (es)' },
                    ],
                }),
            )
        })
    })
})
