import { ProviderTimeoutError } from '../../../common/http/provider-timeout.js'

import { DatabaseService } from './database.service.js'

import type { ConfigService } from '@nestjs/config'
import type { Mock } from 'vitest'

describe('DatabaseService logging', () => {
    it('expires targeted placeholder claims when a new invitation is bound', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = vi.fn().mockResolvedValue({ rowsAffected: 1 })

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await service.groups.setGroupPersonClaimEmail(21, 12, 'Ana@Example.com')

        expect(execute).toHaveBeenCalledWith({
            sql: expect.stringContaining("claimExpiresAt = datetime('now', '+30 days')"),
            args: ['ana@example.com', 21, 12],
        })
    })

    it('clears a legacy invitation claim target when its invitation is deleted', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = vi
            .fn()
            .mockResolvedValueOnce({ rows: [[12, 21]] })
            .mockResolvedValueOnce({ rowsAffected: 1 })
            .mockResolvedValueOnce({ rowsAffected: 1 })

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await expect(service.invitations.deleteInvitationById(99)).resolves.toEqual({ rowsAffected: 1 })
        expect(execute).toHaveBeenNthCalledWith(3, expect.objectContaining({ args: [21, 12, 21] }))
        expect(execute).toHaveBeenNthCalledWith(3, expect.objectContaining({ sql: expect.stringContaining('claimExpiresAt = NULL') }))
    })

    it('logs only the parameterized SQL template, never bound values', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = vi.fn().mockResolvedValue({ rows: [] })
        const logger = vi.spyOn((service as unknown as { LOGGER: { log: (message: string) => void } }).LOGGER, 'log')
        const statement = {
            sql: 'SELECT * FROM Account WHERE email = ? AND password_reset_token = ?',
            args: ['person@example.com', 'reset-token-secret'],
        }

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await service.execute(statement)

        expect(execute).toHaveBeenCalledWith(statement)
        expect(logger).toHaveBeenCalledWith(statement.sql)
        expect(logger).not.toHaveBeenCalledWith(expect.stringContaining('person@example.com'))
        expect(logger).not.toHaveBeenCalledWith(expect.stringContaining('reset-token-secret'))
    })

    it('builds recommendation candidates from selected attendee ownership', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = vi.fn().mockResolvedValue({ rows: [] })

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await service.recommendations.getRecommendationCandidates([1, 2], 2, 120)

        expect(execute).toHaveBeenCalledWith({
            sql: expect.stringContaining('INNER JOIN OwnedGame ownedByAttendee'),
            args: [1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 2, 2, 120],
        })
    })

    it('stores recommendation feedback with its selected-attendee context', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = vi.fn().mockResolvedValue({ rowsAffected: 1 })

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await service.recommendations.createRecommendationFeedback({
            accountId: 1,
            groupId: 7,
            gameId: 42,
            attendeeIds: '[1,2]',
            feedback: 'not_for_us',
        })

        expect(execute).toHaveBeenCalledWith({
            sql: expect.stringContaining('INSERT INTO RecommendationFeedback'),
            args: [1, 7, 42, '[1,2]', 'not_for_us'],
        })
    })

    it('projects linked private ownership with explicit account provenance', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = vi.fn().mockResolvedValue({ rows: [] })

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await service.groups.getGroupPersonOwnership(21, 12)

        expect(execute).toHaveBeenCalledWith({
            sql: expect.stringContaining("'account_collection'"),
            args: [12, 21, 21, 12],
        })
    })

    it('updates the legacy bulk collection path in one idempotent transaction', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }
        const transactionFactory = vi.fn().mockResolvedValue(transaction)

        ;(service as unknown as { tursoClient: { transaction: typeof transactionFactory } }).tursoClient = {
            transaction: transactionFactory,
        }

        await expect(service.collection.updateGames(1, [42, 43], [7])).resolves.toBeUndefined()

        expect(transactionFactory).toHaveBeenCalledWith('write')
        expect(transaction.execute).toHaveBeenNthCalledWith(1, {
            sql: 'DELETE FROM OwnedGame WHERE accountId = ? AND gameId = ?',
            args: [1, 7],
        })
        expect(transaction.execute).toHaveBeenNthCalledWith(2, {
            sql: 'INSERT OR IGNORE INTO OwnedGame (accountId, gameId) VALUES (?, ?)',
            args: [1, 42],
        })
        expect(transaction.execute).toHaveBeenNthCalledWith(3, {
            sql: 'INSERT OR IGNORE INTO OwnedGame (accountId, gameId) VALUES (?, ?)',
            args: [1, 43],
        })
        expect(transaction.commit).toHaveBeenCalledTimes(1)
        expect(transaction.rollback).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('rolls back the legacy bulk collection path when a later write fails', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi.fn().mockResolvedValueOnce({ rowsAffected: 1 }).mockRejectedValueOnce(new Error('ownership write failed')),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: { transaction: Mock } }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(service.collection.updateGames(1, [42], [7])).rejects.toThrow('ownership write failed')

        expect(transaction.rollback).toHaveBeenCalledTimes(1)
        expect(transaction.commit).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('approves a game proposal and its notification in one transaction', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi
                .fn()
                .mockResolvedValueOnce({ lastInsertRowid: 88 })
                .mockResolvedValueOnce({ rowsAffected: 1 })
                .mockResolvedValueOnce({ rowsAffected: 1 })
                .mockResolvedValueOnce({ rowsAffected: 1 })
                .mockResolvedValueOnce({ rows: [[4, null]] })
                .mockResolvedValueOnce({ rowsAffected: 1 }),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: { transaction: Mock } }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(
            service.games.approveGameProposalAtomically({
                proposalId: 12,
                reviewerId: 7,
                title: 'Catan',
                imageUrl: 'https://example.com/catan.jpg',
                gameAvgDuration: 60,
                minPlayers: 3,
                maxPlayers: 4,
                translations: [{ languageCode: 'en', title: 'Catan', normalizedTitle: 'catan' }],
                tagIds: [2],
                reviewNotes: 'Ready for the shelf',
                notification: {
                    accountId: 4,
                    type: 'game_proposal_approved',
                    message: 'Your proposal was approved',
                    data: { gameTitle: 'Catan', proposalId: 12 },
                },
            }),
        ).resolves.toEqual({ createdGameId: 88 })

        expect(transaction.execute).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ sql: expect.stringContaining('INSERT INTO Game') }),
        )
        expect(transaction.execute).toHaveBeenNthCalledWith(2, expect.objectContaining({ sql: expect.stringContaining('GameTranslation') }))
        expect(transaction.execute).toHaveBeenNthCalledWith(3, {
            sql: 'INSERT OR IGNORE INTO GameTag (gameId, tagId) VALUES (?, ?)',
            args: [88, 2],
        })
        expect(transaction.execute).toHaveBeenNthCalledWith(
            4,
            expect.objectContaining({ sql: expect.stringContaining("status = 'approved'") }),
        )
        expect(transaction.execute).toHaveBeenNthCalledWith(
            5,
            expect.objectContaining({ sql: expect.stringContaining('SELECT submittedBy, addTo FROM GameProposal') }),
        )
        expect(transaction.execute).toHaveBeenNthCalledWith(
            6,
            expect.objectContaining({ sql: expect.stringContaining('INSERT INTO Notification') }),
        )
        expect(transaction.execute).toHaveBeenNthCalledWith(
            6,
            expect.objectContaining({
                args: [
                    4,
                    'game_proposal_approved',
                    'Your proposal was approved',
                    '{"gameTitle":"Catan","proposalId":12,"createdGameId":88}',
                ],
            }),
        )
        expect(transaction.commit).toHaveBeenCalledTimes(1)
        expect(transaction.rollback).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('rolls back proposal approval when notification persistence fails', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi
                .fn()
                .mockResolvedValueOnce({ lastInsertRowid: 88 })
                .mockResolvedValueOnce({ rowsAffected: 1 })
                .mockResolvedValueOnce({ rowsAffected: 1 })
                .mockResolvedValueOnce({ rowsAffected: 1 })
                .mockResolvedValueOnce({ rows: [[4, null]] })
                .mockRejectedValueOnce(new Error('notification write failed')),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: { transaction: Mock } }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(
            service.games.approveGameProposalAtomically({
                proposalId: 12,
                reviewerId: 7,
                title: 'Catan',
                imageUrl: 'https://example.com/catan.jpg',
                gameAvgDuration: 60,
                minPlayers: 3,
                maxPlayers: 4,
                translations: [{ languageCode: 'en', title: 'Catan', normalizedTitle: 'catan' }],
                tagIds: [2],
                notification: {
                    accountId: 4,
                    type: 'game_proposal_approved',
                    message: 'Your proposal was approved',
                    data: { gameTitle: 'Catan', proposalId: 12 },
                },
            }),
        ).rejects.toThrow('notification write failed')

        expect(transaction.rollback).toHaveBeenCalledTimes(1)
        expect(transaction.commit).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    describe("approval with the proposer's collection choice", () => {
        const approve = (service: DatabaseService) =>
            service.games.approveGameProposalAtomically({
                proposalId: 12,
                reviewerId: 7,
                title: 'Catan',
                imageUrl: '',
                gameAvgDuration: 60,
                minPlayers: 3,
                maxPlayers: 4,
                translations: [{ languageCode: 'en', title: 'Catan', normalizedTitle: 'catan' }],
                tagIds: [],
                notification: {
                    accountId: 4,
                    type: 'game_proposal_approved',
                    message: 'Approved',
                    data: { gameTitle: 'Catan', proposalId: 12 },
                },
            })

        const setup = (addTo: string, failOn?: string) => {
            const service = new DatabaseService({} as ConfigService)
            const transaction = {
                execute: vi.fn().mockImplementation(({ sql }: { sql: string }) => {
                    if (failOn && sql.includes(failOn)) return Promise.reject(new Error(`${failOn} failed`))
                    if (sql.includes('INSERT INTO Game ')) return Promise.resolve({ lastInsertRowid: 88 })
                    if (sql.includes('SELECT submittedBy, addTo')) return Promise.resolve({ rows: [[4, addTo]] })
                    return Promise.resolve({ rowsAffected: 1 })
                }),
                commit: vi.fn().mockResolvedValue(undefined),
                rollback: vi.fn().mockResolvedValue(undefined),
                close: vi.fn(),
            }

            ;(service as unknown as { tursoClient: { transaction: Mock } }).tursoClient = {
                transaction: vi.fn().mockResolvedValue(transaction),
            }
            const statements = () => transaction.execute.mock.calls.map(([statement]) => statement as { sql: string; args: unknown[] })

            return { service, transaction, statements }
        }

        it.each([
            ['shelf', 'INSERT INTO OwnedGame', 'added'],
            ['wishlist', 'INSERT INTO WishlistedGame', 'wishlisted'],
        ])("puts the new game on the proposer's %s and logs it", async (addTo, insert, action) => {
            const { service, transaction, statements } = setup(addTo)

            await expect(approve(service)).resolves.toEqual({ createdGameId: 88 })

            expect(statements().find(statement => statement.sql.includes(insert))?.args).toEqual([4, 88])
            expect(statements().find(statement => statement.sql.includes('INSERT INTO CollectionActivity'))?.args).toEqual([
                4,
                88,
                action,
                null,
            ])
            expect(transaction.commit).toHaveBeenCalledTimes(1)
        })

        it('adds nothing when the proposer chose neither', async () => {
            const { service, statements } = setup(null as unknown as string)

            await approve(service)

            expect(statements().some(statement => /OwnedGame|WishlistedGame|CollectionActivity/.test(statement.sql))).toBe(false)
        })

        it('rolls back the whole approval when the shelf write fails', async () => {
            const { service, transaction } = setup('shelf', 'INSERT INTO OwnedGame')

            await expect(approve(service)).rejects.toThrow('INSERT INTO OwnedGame failed')

            expect(transaction.rollback).toHaveBeenCalledTimes(1)
            expect(transaction.commit).not.toHaveBeenCalled()
        })
    })

    it('saves a proposal and notifies every other active admin in one transaction', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi.fn().mockResolvedValueOnce({ lastInsertRowid: 31 }).mockResolvedValueOnce({ rowsAffected: 2 }),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: { transaction: Mock } }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(
            service.games.createGameProposal({
                submittedBy: 5,
                title: 'Azul',
                addTo: 'shelf',
                adminNotification: {
                    type: 'game_proposal_submitted',
                    message: 'New game proposal: "Azul"',
                    data: { gameTitle: 'Azul', submittedBy: 5 },
                },
            }),
        ).resolves.toEqual({ proposalId: 31 })

        expect(transaction.execute.mock.calls[0]![0].args).toEqual([5, 'Azul', null, null, null, null, null, null, 'shelf'])
        expect(transaction.execute.mock.calls[1]![0]).toEqual({
            sql: expect.stringContaining('WHERE isAdmin = 1 AND isDeleted = 0 AND id != ?'),
            args: ['game_proposal_submitted', 'New game proposal: "Azul"', '{"gameTitle":"Azul","submittedBy":5,"proposalId":31}', 5],
        })
        expect(transaction.commit).toHaveBeenCalledTimes(1)
    })

    it('rejects a game proposal and its notification in one transaction', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi.fn().mockResolvedValueOnce({ rowsAffected: 1 }).mockResolvedValueOnce({ rowsAffected: 1 }),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: { transaction: Mock } }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(
            service.games.closeGameProposalAtomically({
                proposalId: 12,
                status: 'rejected',
                reviewerId: 7,
                reviewNotes: 'Already present',
                notification: {
                    accountId: 4,
                    type: 'game_proposal_rejected',
                    message: 'Your proposal was rejected',
                    data: { gameTitle: 'Catan', proposalId: 12, reviewNotes: 'Already present' },
                },
            }),
        ).resolves.toBeUndefined()

        expect(transaction.execute).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ sql: expect.stringContaining("status = 'pending'"), args: ['rejected', 7, 'Already present', 12] }),
        )
        expect(transaction.execute).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ sql: expect.stringContaining('INSERT INTO Notification') }),
        )
        expect(transaction.commit).toHaveBeenCalledTimes(1)
        expect(transaction.rollback).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('rolls back proposal rejection when notification persistence fails', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi.fn().mockResolvedValueOnce({ rowsAffected: 1 }).mockRejectedValueOnce(new Error('notification write failed')),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: { transaction: Mock } }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(
            service.games.closeGameProposalAtomically({
                proposalId: 12,
                status: 'rejected',
                reviewerId: 7,
                reviewNotes: 'Already present',
                notification: {
                    accountId: 4,
                    type: 'game_proposal_rejected',
                    message: 'Your proposal was rejected',
                    data: { gameTitle: 'Catan', proposalId: 12, reviewNotes: 'Already present' },
                },
            }),
        ).rejects.toThrow('notification write failed')

        expect(transaction.rollback).toHaveBeenCalledTimes(1)
        expect(transaction.commit).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('adds collection ownership, memory, and wishlist cleanup in one transaction', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = vi
            .fn()
            .mockResolvedValueOnce({ rowsAffected: 1 })
            .mockResolvedValueOnce({ rowsAffected: 1 })
            .mockResolvedValueOnce({ rows: [{}] })
            .mockResolvedValueOnce({ rowsAffected: 1 })
            .mockResolvedValueOnce({ rowsAffected: 1 })
            .mockResolvedValueOnce({ rowsAffected: 1 })
        const transaction = {
            execute,
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }
        const transactionFactory = vi.fn().mockResolvedValue(transaction)

        ;(service as unknown as { tursoClient: { transaction: typeof transactionFactory } }).tursoClient = {
            transaction: transactionFactory,
        }

        await expect(service.collection.addGameToCollection(1, 42)).resolves.toEqual({ success: true, wishlistRemoved: true })

        expect(transactionFactory).toHaveBeenCalledWith('write')
        expect(execute).toHaveBeenNthCalledWith(1, {
            sql: 'INSERT OR IGNORE INTO OwnedGame (accountId, gameId) VALUES (?, ?)',
            args: [1, 42],
        })
        expect(execute).toHaveBeenCalledWith({
            sql: 'SELECT 1 FROM WishlistedGame WHERE accountId = ? AND gameId = ?',
            args: [1, 42],
        })
        expect(execute).toHaveBeenCalledWith(expect.objectContaining({ sql: expect.stringContaining('DELETE FROM CollectionActivity') }))
        expect(transaction.commit).toHaveBeenCalledTimes(1)
        expect(transaction.rollback).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('reports duplicate collection activation without touching activity or wishlist state', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = vi.fn().mockResolvedValue({ rowsAffected: 0 })
        const transaction = {
            execute,
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: { transaction: Mock } }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(service.collection.addGameToCollection(1, 42)).resolves.toEqual({ success: false, wishlistRemoved: false })

        expect(execute).toHaveBeenCalledTimes(1)
        expect(transaction.commit).toHaveBeenCalledTimes(1)
        expect(transaction.rollback).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('rolls back collection activation when activity memory fails', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi.fn().mockResolvedValueOnce({ rowsAffected: 1 }).mockRejectedValueOnce(new Error('activity write failed')),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: { transaction: Mock } }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(service.collection.addGameToCollection(1, 42)).rejects.toThrow('activity write failed')

        expect(transaction.rollback).toHaveBeenCalledTimes(1)
        expect(transaction.commit).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('removes collection ownership and its memory in one transaction', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi
                .fn()
                .mockResolvedValueOnce({ rowsAffected: 1 })
                .mockResolvedValueOnce({ rowsAffected: 1 })
                .mockResolvedValueOnce({ rowsAffected: 1 }),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: { transaction: Mock } }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(service.collection.removeGameFromCollection(1, 42)).resolves.toEqual({ rowsAffected: 1 })

        expect(transaction.execute).toHaveBeenNthCalledWith(1, {
            sql: 'DELETE FROM OwnedGame WHERE accountId = ? AND gameId = ?',
            args: [1, 42],
        })
        expect(transaction.execute).toHaveBeenCalledWith(
            expect.objectContaining({ sql: expect.stringContaining('DELETE FROM CollectionActivity') }),
        )
        expect(transaction.commit).toHaveBeenCalledTimes(1)
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('updates ownership metadata and activity memory in one transaction', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi
                .fn()
                .mockResolvedValueOnce({ rowsAffected: 1 })
                .mockResolvedValueOnce({ rowsAffected: 1 })
                .mockResolvedValueOnce({ rowsAffected: 1 }),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: { transaction: Mock } }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(service.collection.updateGameOwnershipAndLogActivity(1, 42, { purchaseNotes: 'Gift' })).resolves.toEqual({
            rowsAffected: 1,
        })

        expect(transaction.execute).toHaveBeenNthCalledWith(1, {
            sql: 'UPDATE OwnedGame SET purchaseNotes = ? WHERE accountId = ? AND gameId = ?',
            args: ['Gift', 1, 42],
        })
        expect(transaction.commit).toHaveBeenCalledTimes(1)
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('toggles wishlist state and records the social activity in one transaction', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi
                .fn()
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rowsAffected: 1 })
                .mockResolvedValueOnce({ rowsAffected: 1 })
                .mockResolvedValueOnce({ rowsAffected: 1 }),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: { transaction: Mock } }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(service.collection.toggleWishlistAndLogActivity(1, 42)).resolves.toBe(true)

        expect(transaction.execute).toHaveBeenNthCalledWith(2, {
            sql: 'INSERT INTO WishlistedGame (accountId, gameId) VALUES (?, ?)',
            args: [1, 42],
        })
        expect(transaction.execute).toHaveBeenNthCalledWith(3, {
            sql: 'INSERT INTO CollectionActivity (accountId, gameId, actionType, actionDetails) VALUES (?, ?, ?, ?)',
            args: [1, 42, 'wishlisted', null],
        })
        expect(transaction.commit).toHaveBeenCalledTimes(1)
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('saves a review and its rating memory in one transaction', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi
                .fn()
                .mockResolvedValueOnce({ rowsAffected: 1 })
                .mockResolvedValueOnce({ rowsAffected: 1 })
                .mockResolvedValueOnce({ rowsAffected: 1 }),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: { transaction: Mock } }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(service.collection.saveGameReviewAndLogActivity(1, 42, 8)).resolves.toEqual({ success: true })

        expect(transaction.execute).toHaveBeenNthCalledWith(1, {
            sql: expect.stringContaining('ON CONFLICT (accountId, gameId) DO UPDATE SET review = excluded.review'),
            args: [1, 42, 8],
        })
        expect(transaction.execute).toHaveBeenNthCalledWith(2, {
            sql: 'INSERT INTO CollectionActivity (accountId, gameId, actionType, actionDetails) VALUES (?, ?, ?, ?)',
            args: [1, 42, 'rated', '{"rating":8}'],
        })
        expect(transaction.commit).toHaveBeenCalledTimes(1)
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('logs no activity when the same rating is saved again', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi.fn().mockResolvedValueOnce({ rowsAffected: 0 }),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: { transaction: Mock } }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(service.collection.saveGameReviewAndLogActivity(1, 42, 8)).resolves.toEqual({ success: true })

        expect(transaction.execute).toHaveBeenCalledTimes(1)
        expect(transaction.commit).toHaveBeenCalledTimes(1)
        expect(transaction.rollback).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('counts each group rating once, however many groups its author shares', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = vi.fn().mockResolvedValue({ rows: [] })

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await service.collection.getAvgGroupsRating(6, 18)

        const [{ sql, args }] = execute.mock.calls[0]

        expect(sql).toContain('gr.accountId IN (')
        expect(sql).toContain('SELECT DISTINCT member.accountId')
        expect(sql).not.toMatch(/JOIN GroupMembership gm2/)
        expect(args).toEqual([18, 6])
    })

    it('rolls back review replacement when rated activity memory fails', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi.fn().mockResolvedValueOnce({ rowsAffected: 1 }).mockRejectedValueOnce(new Error('review write failed')),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: { transaction: Mock } }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(service.collection.saveGameReviewAndLogActivity(1, 42, 8)).rejects.toThrow('review write failed')

        expect(transaction.rollback).toHaveBeenCalledTimes(1)
        expect(transaction.commit).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('guards group acquisition interest against games already owned by a member', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = vi.fn().mockResolvedValue({ rowsAffected: 1 })

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await service.groups.addGroupGameInterest(7, 1, { gameId: 42 })

        expect(execute).toHaveBeenCalledWith({
            sql: expect.stringContaining('WHERE NOT EXISTS'),
            args: [7, 1, 42, 7, 42, 7, 42],
        })
    })

    it('reopens a group acquisition decision with the member interest in one transaction', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi.fn().mockResolvedValueOnce({ rowsAffected: 1 }).mockResolvedValueOnce({ rowsAffected: 1 }),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: { transaction: Mock } }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(service.groups.addGroupGameInterestAndReopenDecision(7, 1, 42)).resolves.toEqual({ rowsAffected: 1 })

        expect(transaction.execute).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                sql: expect.stringContaining('INSERT OR IGNORE INTO GroupGameInterest'),
                args: [7, 1, 42, 7, 42, 7, 42],
            }),
        )
        expect(transaction.execute).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                sql: expect.stringContaining("SET status = 'open'"),
                args: [7, 42],
            }),
        )
        expect(transaction.commit).toHaveBeenCalledTimes(1)
        expect(transaction.rollback).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('rolls back group interest when reopening its decision fails', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi.fn().mockResolvedValueOnce({ rowsAffected: 1 }).mockRejectedValueOnce(new Error('decision write failed')),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: { transaction: Mock } }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(service.groups.addGroupGameInterestAndReopenDecision(7, 1, 42)).rejects.toThrow('decision write failed')

        expect(transaction.rollback).toHaveBeenCalledTimes(1)
        expect(transaction.commit).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('upserts a group acquisition decision without creating purchase semantics', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = vi.fn().mockResolvedValue({ rowsAffected: 1 })

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await service.groups.upsertGroupAcquisitionDecision(7, 42, 1, 'planned', 'Buy before autumn')

        expect(execute).toHaveBeenCalledWith({
            sql: expect.stringContaining('ON CONFLICT(groupId, gameId) DO UPDATE SET'),
            args: [7, 42, 'planned', 1, 'Buy before autumn'],
        })
    })

    it('accepts an invitation by creating membership and consuming the invitation in one transaction', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi
                .fn()
                .mockResolvedValueOnce({ rows: [[42, null]] })
                .mockResolvedValueOnce({ rowsAffected: 1 })
                .mockResolvedValueOnce({ rowsAffected: 1 })
                .mockResolvedValueOnce({ rowsAffected: 1 }),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(service.invitations.acceptInvitationAtomically(42, 7, 12)).resolves.toEqual({ success: true })
        expect(transaction.execute).toHaveBeenNthCalledWith(1, {
            sql: expect.stringContaining('SELECT id'),
            args: [42, 12, 7],
        })
        expect(transaction.execute).toHaveBeenNthCalledWith(2, {
            sql: 'INSERT OR IGNORE INTO GroupMembership (accountId, groupId) VALUES (?, ?)',
            args: [7, 12],
        })
        expect(transaction.execute).toHaveBeenNthCalledWith(3, {
            sql: expect.stringContaining('INSERT INTO GroupPerson'),
            args: [12, 12, 7, 12, 7],
        })
        expect(transaction.execute).toHaveBeenNthCalledWith(4, {
            sql: expect.stringContaining('DELETE FROM Invitation'),
            args: [42, 12, 7],
        })
        expect(transaction.commit).toHaveBeenCalledTimes(1)
        expect(transaction.rollback).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('does not resolve soft-deleted accounts for username invitations', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = vi.fn().mockResolvedValue({ rows: [] })

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await expect(
            service.invitations.createInvitationByUsername({ groupId: 12, fromAccountId: 7, username: 'former-member' }),
        ).rejects.toThrow('User not found')

        expect(execute).toHaveBeenCalledWith({
            sql: 'SELECT id, email, username, avatar, displayName, created_at, isDeleted, isAdmin, clerkUserId FROM Account WHERE username = ? AND isDeleted = 0',
            args: ['former-member'],
        })
        expect(execute).toHaveBeenCalledTimes(1)
    })

    it('rolls back invitation acceptance when the membership write fails', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi
                .fn()
                .mockResolvedValueOnce({ rows: [[42]] })
                .mockRejectedValueOnce(new Error('membership write failed')),
            commit: vi.fn(),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(service.invitations.acceptInvitationAtomically(42, 7, 12)).rejects.toThrow('membership write failed')
        expect(transaction.rollback).toHaveBeenCalledTimes(1)
        expect(transaction.commit).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('reads recommendation feedback with only current group-member identity fields', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = vi.fn().mockResolvedValue({ rows: [] })

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await service.recommendations.getRecommendationFeedbackForGroup(7)

        expect(execute).toHaveBeenCalledWith({
            sql: expect.stringContaining('INNER JOIN GroupMembership'),
            args: [7],
        })
        expect(execute.mock.calls[0]![0].sql).toContain('a.username')
        expect(execute.mock.calls[0]![0].sql).not.toContain('a.email')
    })

    it('reads only organizer-recorded attendees for session history', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = vi.fn().mockResolvedValue({ rows: [[1], [3]] })

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await expect(service.sessions.getMeetAttendedAccountIds(12)).resolves.toEqual([1, 3])
        expect(execute).toHaveBeenCalledWith({
            sql: "SELECT accountId FROM MeetAttendee WHERE meetId = ? AND attendanceStatus = 'attended'",
            args: [12],
        })
    })

    it('uses recorded attendance for personal history and only falls back to legacy play links without an attendee row', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = vi.fn().mockResolvedValue({ rows: [[12], [10]] })

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await expect(service.sessions.getDistinctCompletedMeetIdsForAccountHistory(7)).resolves.toEqual([12, 10])
        expect(execute).toHaveBeenCalledWith({
            sql: expect.stringContaining("m.status = 'completed'"),
            args: [7, 7, 7, 7, 7],
        })
        expect(execute.mock.calls[0]![0].sql).toContain("ma.attendanceStatus = 'attended'")
    })

    it('requires a session organizer to remain a member of the private group', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = vi.fn().mockResolvedValue({ rows: [] })

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await service.sessions.getMeetByIdForCreator(12, 7)

        expect(execute).toHaveBeenCalledWith({
            sql: expect.stringContaining('INNER JOIN GroupMembership gm'),
            args: [7, 12, 7],
        })
    })

    it('builds recommendation diagnostics for the empty-state explanation', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = vi.fn().mockResolvedValue({ rows: [[4, 2, 0]] })

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await service.recommendations.getRecommendationCandidateCounts([1, 2], 2, 60)

        expect(execute).toHaveBeenCalledWith({
            sql: expect.stringContaining('durationFitCount'),
            args: [2, 2, 2, 2, 60, 1, 2],
        })
    })

    it('writes a completed session and its relations using the captured meet id', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi.fn().mockResolvedValue({ lastInsertRowid: 42 }),
            batch: vi.fn().mockResolvedValue([]),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await service.sessions.createCompletedSession({
            groupId: 7,
            createdBy: 1,
            sessionDate: '2026-08-16T19:30:00.000Z',
            timezone: 'Europe/Madrid',
            notes: 'A rematch after the campaign finale.',
            attendeeIds: [1, 2],
            games: [{ gameId: 42, participantIds: [1, 2] }],
        })

        expect(transaction.execute).toHaveBeenCalledWith({
            sql: expect.stringContaining(
                'INSERT INTO Meet (groupId, createdBy, meetDate, isConfirmed, status, timezone, notes, updatedAt)',
            ),
            args: [7, 1, '2026-08-16T19:30:00.000Z', 'Europe/Madrid', 'A rematch after the campaign finale.'],
        })
        expect(transaction.batch).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ args: [42, 1] }),
                expect.objectContaining({ args: [42, 2] }),
                expect.objectContaining({ args: [42, 42] }),
                expect.objectContaining({ args: [42, 1, 42] }),
            ]),
        )
        expect(transaction.commit).toHaveBeenCalledTimes(1)
        expect(transaction.rollback).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('rolls back and closes the transaction when a session write fails', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi.fn().mockRejectedValue(new Error('write failed')),
            batch: vi.fn(),
            commit: vi.fn(),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(
            service.sessions.createCompletedSession({
                groupId: 7,
                createdBy: 1,
                sessionDate: '2026-08-16T19:30:00.000Z',
                timezone: 'Europe/Madrid',
                attendeeIds: [1],
                games: [{ gameId: 42, participantIds: [1] }],
            }),
        ).rejects.toThrow('write failed')

        expect(transaction.rollback).toHaveBeenCalledTimes(1)
        expect(transaction.commit).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('joins a provisioned Clerk account only to the inviter-owned group', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi
                .fn()
                .mockResolvedValueOnce({ rows: [[12]] })
                .mockResolvedValueOnce({ rowsAffected: 1 })
                .mockResolvedValueOnce({ rowsAffected: 1 }),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await service.groups.joinGroupFromClerkInvitation(9, { groupId: 12, inviterAccountId: 7, version: 1 })

        expect(transaction.execute).toHaveBeenNthCalledWith(1, {
            sql: 'SELECT id FROM UserGroup WHERE id = ? AND createdBy = ?',
            args: [12, 7],
        })
        expect(transaction.execute).toHaveBeenNthCalledWith(2, {
            sql: 'INSERT OR IGNORE INTO GroupMembership (accountId, groupId) VALUES (?, ?)',
            args: [9, 12],
        })
        expect(transaction.execute).toHaveBeenNthCalledWith(3, {
            sql: expect.stringContaining('INSERT INTO GroupPerson'),
            args: [12, 12, 9, 12, 9],
        })
        expect(transaction.commit).toHaveBeenCalledTimes(1)
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('rolls back a Clerk invitation join when the group is no longer available', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi.fn().mockResolvedValueOnce({ rows: [] }),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(service.groups.joinGroupFromClerkInvitation(9, { groupId: 404, inviterAccountId: 7, version: 1 })).rejects.toThrow(
            'The group invitation is no longer valid',
        )

        expect(transaction.execute).toHaveBeenCalledTimes(1)
        expect(transaction.commit).not.toHaveBeenCalled()
        expect(transaction.rollback).toHaveBeenCalledTimes(1)
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('creates a group and owner membership in one transaction', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi
                .fn()
                .mockResolvedValueOnce({ lastInsertRowid: 77 })
                .mockResolvedValueOnce({ rowsAffected: 1 })
                .mockResolvedValueOnce({ rowsAffected: 1 }),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(service.groups.createGroupWithMembership({ name: 'Friends / Friday', createdBy: 7 })).resolves.toEqual({ groupId: 77 })

        expect(transaction.execute).toHaveBeenNthCalledWith(1, {
            sql: 'INSERT INTO UserGroup (name, createdBy) VALUES (?, ?)',
            args: ['Friends / Friday', 7],
        })
        expect(transaction.execute).toHaveBeenNthCalledWith(2, {
            sql: 'INSERT INTO GroupMembership (accountId, groupId) VALUES (?, ?)',
            args: [7, 77],
        })
        expect(transaction.execute).toHaveBeenNthCalledWith(3, {
            sql: expect.stringContaining('INSERT INTO GroupPerson'),
            args: [77, 7, 7],
        })
        expect(transaction.commit).toHaveBeenCalledTimes(1)
        expect(transaction.rollback).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('rolls back group creation when owner membership fails', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi.fn().mockResolvedValueOnce({ lastInsertRowid: 77 }).mockRejectedValueOnce(new Error('membership write failed')),
            commit: vi.fn(),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(service.groups.createGroupWithMembership({ name: 'Friends', createdBy: 7 })).rejects.toThrow('membership write failed')

        expect(transaction.rollback).toHaveBeenCalledTimes(1)
        expect(transaction.commit).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('replaces session attendees in one transaction', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
            batch: vi.fn().mockResolvedValue([]),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(service.sessions.replaceMeetAttendees(12, [1, 3], 'scheduled')).resolves.toBe(true)

        expect(transaction.execute).toHaveBeenCalledWith({
            sql: 'UPDATE Meet SET updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND status = ?',
            args: [12, 'scheduled'],
        })
        expect(transaction.execute).toHaveBeenCalledWith({
            sql: 'DELETE FROM MeetAttendee WHERE meetId = ? AND accountId NOT IN (?, ?)',
            args: [12, 1, 3],
        })
        expect(transaction.batch).toHaveBeenCalledWith([
            expect.objectContaining({ args: [12, 1] }),
            expect.objectContaining({ args: [12, 3] }),
        ])
        expect(transaction.commit).toHaveBeenCalledTimes(1)
        expect(transaction.rollback).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('replaces planned session games atomically and allows clearing the shortlist', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
            batch: vi.fn().mockResolvedValue([]),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(service.sessions.replaceMeetPlannedGames(12, [42, 43], 'active')).resolves.toBe(true)
        expect(transaction.execute).toHaveBeenCalledWith({
            sql: 'UPDATE Meet SET updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND status = ?',
            args: [12, 'active'],
        })
        expect(transaction.execute).toHaveBeenCalledWith({
            sql: "DELETE FROM MeetGame WHERE meetId = ? AND gameStatus = 'planned'",
            args: [12],
        })
        expect(transaction.batch).toHaveBeenCalledWith([
            expect.objectContaining({ args: [12, 42] }),
            expect.objectContaining({ args: [12, 43] }),
        ])
        expect(transaction.commit).toHaveBeenCalledTimes(1)

        transaction.execute.mockClear()
        transaction.batch.mockClear()
        await expect(service.sessions.replaceMeetPlannedGames(12, [], 'active')).resolves.toBe(true)
        expect(transaction.batch).not.toHaveBeenCalled()
        expect(transaction.commit).toHaveBeenCalledTimes(2)
    })

    it('rolls back session attendee replacement when inserts fail', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
            batch: vi.fn().mockRejectedValue(new Error('attendee write failed')),
            commit: vi.fn(),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(service.sessions.replaceMeetAttendees(12, [1, 3], 'active')).rejects.toThrow('attendee write failed')
        expect(transaction.rollback).toHaveBeenCalledTimes(1)
        expect(transaction.commit).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('writes scheduled attendees as pending in one transaction', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi.fn().mockResolvedValue({ lastInsertRowid: 43 }),
            batch: vi.fn().mockResolvedValue([]),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(
            service.sessions.createScheduledSession({
                groupId: 7,
                createdBy: 1,
                sessionDate: '2026-08-21T19:30:00.000Z',
                timezone: 'Europe/Madrid',
                attendeeIds: [1, 2],
                plannedGameIds: [42],
            }),
        ).resolves.toEqual({ lastInsertRowid: 43 })

        expect(transaction.execute).toHaveBeenCalledWith({
            sql: expect.stringContaining("VALUES (?, ?, ?, FALSE, 'scheduled', ?, ?, CURRENT_TIMESTAMP)"),
            args: [7, 1, '2026-08-21T19:30:00.000Z', 'Europe/Madrid', null],
        })
        expect(transaction.batch).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ args: [43, 1] }),
                expect.objectContaining({ args: [43, 2] }),
                expect.objectContaining({ args: [43, 42] }),
            ]),
        )
        expect(transaction.commit).toHaveBeenCalledTimes(1)
    })

    it('keeps legacy play links and canonical played games synchronized', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi
                .fn()
                .mockResolvedValueOnce({ rowsAffected: 1 })
                .mockResolvedValueOnce({ rowsAffected: 1 })
                .mockResolvedValueOnce({ rowsAffected: 1 }),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(service.sessions.createMeetAccountGame(1, 12, 42)).resolves.toEqual({ rowsAffected: 1 })
        expect(transaction.execute).toHaveBeenNthCalledWith(1, {
            sql: expect.stringContaining('INSERT OR IGNORE INTO MeetGame'),
            args: [12, 42],
        })
        expect(transaction.execute).toHaveBeenNthCalledWith(2, {
            sql: expect.stringContaining("SET gameStatus = 'played'"),
            args: [12, 42],
        })
        expect(transaction.execute).toHaveBeenNthCalledWith(3, {
            sql: 'INSERT OR IGNORE INTO MeetAccountGame (accountId, meetId, gameId) VALUES (?, ?, ?)',
            args: [1, 12, 42],
        })
        expect(transaction.commit).toHaveBeenCalledTimes(1)
    })

    it('marks remaining planned games as skipped when a session becomes terminal', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi.fn().mockResolvedValueOnce({ rowsAffected: 1 }).mockResolvedValueOnce({ rowsAffected: 2 }),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(service.sessions.updateMeetStatus(12, 'active', 'completed')).resolves.toEqual({ rowsAffected: 1 })

        expect(transaction.execute).toHaveBeenNthCalledWith(1, {
            sql: expect.stringContaining('SET status = ?'),
            args: ['completed', true, null, 12, 'active'],
        })
        expect(transaction.execute).toHaveBeenNthCalledWith(2, {
            sql: expect.stringContaining("SET gameStatus = 'skipped'"),
            args: [12],
        })
        expect(transaction.commit).toHaveBeenCalledTimes(1)
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('does not rewrite planned games while a session remains active', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(service.sessions.updateMeetStatus(12, 'scheduled', 'active')).resolves.toEqual({ rowsAffected: 1 })

        expect(transaction.execute).toHaveBeenCalledTimes(1)
        expect(transaction.commit).toHaveBeenCalledTimes(1)
    })

    it('does not mark planned games skipped when a concurrent status change wins', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: vi.fn().mockResolvedValue({ rowsAffected: 0 }),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: vi.fn().mockResolvedValue(transaction),
        }

        await expect(service.sessions.updateMeetStatus(12, 'scheduled', 'cancelled')).resolves.toEqual({ rowsAffected: 0 })

        expect(transaction.execute).toHaveBeenCalledTimes(1)
        expect(transaction.commit).toHaveBeenCalledTimes(1)
        expect(transaction.rollback).not.toHaveBeenCalled()
    })

    describe('a database timeout', () => {
        const serviceWith = (execute: Mock) => {
            const service = new DatabaseService({} as ConfigService)

            ;(service as unknown as { tursoClient: { execute: Mock } }).tursoClient = { execute }
            return service
        }

        it('retries a read once and logs the retry without the SQL', async () => {
            const execute = vi.fn().mockRejectedValueOnce(new ProviderTimeoutError('database')).mockResolvedValueOnce({ rows: [] })
            const service = serviceWith(execute)
            const warn = vi
                .spyOn((service as unknown as { LOGGER: { warn: (message: string) => void } }).LOGGER, 'warn')
                .mockImplementation(() => undefined)

            // Column names that contain a write keyword still make a read.
            await expect(service.execute('SELECT id, isDeleted, updated_at FROM Account')).resolves.toEqual({ rows: [] })
            expect(execute).toHaveBeenCalledTimes(2)
            expect(warn).toHaveBeenCalledWith('{"event":"database.retry","reason":"timeout"}')
        })

        it('gives up after the second timeout', async () => {
            const execute = vi.fn().mockRejectedValue(new ProviderTimeoutError('database'))

            await expect(serviceWith(execute).execute({ sql: 'WITH x AS (SELECT 1) SELECT * FROM x', args: [] })).rejects.toBeInstanceOf(
                ProviderTimeoutError,
            )
            expect(execute).toHaveBeenCalledTimes(2)
        })

        it('never repeats a write', async () => {
            const execute = vi.fn().mockRejectedValue(new ProviderTimeoutError('database'))

            await expect(serviceWith(execute).execute({ sql: 'INSERT INTO Meet (groupId) VALUES (?)', args: [1] })).rejects.toBeInstanceOf(
                ProviderTimeoutError,
            )
            await expect(
                serviceWith(execute).execute({ sql: 'WITH x AS (SELECT 1) DELETE FROM Meet WHERE id IN x', args: [] }),
            ).rejects.toBeInstanceOf(ProviderTimeoutError)
            expect(execute).toHaveBeenCalledTimes(2)
        })

        it('does not retry other errors', async () => {
            const execute = vi.fn().mockRejectedValue(new Error('SQLITE_ERROR'))

            await expect(serviceWith(execute).execute('SELECT 1')).rejects.toThrow('SQLITE_ERROR')
            expect(execute).toHaveBeenCalledTimes(1)
        })
    })
})
