import { BadRequestException } from '@nestjs/common'

import type { CollectionActivityDto } from '../../../../common/types/collection-activity.type'
import type { GameOwnedDto, UpdateGameOwnedDto } from '../../../../common/types/game-owned.type'
import type { DatabaseService } from '../database.service'

/** Personal collections: owned games, wishlist, reviews, and activity. */
export class CollectionQueries {
    constructor(private readonly database: DatabaseService) {}

    getUserReviews(userId: number) {
        return this.database.execute({
            sql: `
                SELECT 
                    gr.accountId,
                    gr.gameId, 
                    gr.review, 
                    gr.reviewDate 
                FROM GameReview gr
                WHERE gr.accountId = ?;
            `,
            args: [userId],
        })
    }

    async updateGames(accountId: number, gamesToAdd: number[], gamesToRemove: number[]): Promise<void> {
        const transaction = await this.database.transaction('write')

        try {
            for (const gameId of gamesToRemove) {
                await transaction.execute({
                    sql: 'DELETE FROM OwnedGame WHERE accountId = ? AND gameId = ?',
                    args: [accountId, gameId],
                })
            }

            for (const gameId of gamesToAdd) {
                await transaction.execute({
                    sql: 'INSERT OR IGNORE INTO OwnedGame (accountId, gameId) VALUES (?, ?)',
                    args: [accountId, gameId],
                })
            }

            await transaction.commit()
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    getOwnedGames() {
        return this.database.execute('SELECT * FROM OwnedGame')
    }

    getGameOwnedByAccountIdAndGameId(accountId: number, gameId: number) {
        return this.database.execute({
            sql: 'SELECT * FROM OwnedGame WHERE accountId = ? AND gameId = ?',
            args: [accountId, gameId],
        })
    }

    getOwnedGamesByAccountId(accountId: number) {
        return this.database.execute({
            sql: 'SELECT * FROM OwnedGame WHERE accountId = ?',
            args: [accountId],
        })
    }

    isGameIdOwnedByAccountId(accountId: number, gameId: number) {
        return this.database.execute({
            sql: 'SELECT * FROM OwnedGame WHERE accountId = ? AND gameId = ?',
            args: [accountId, gameId],
        })
    }

    async createOwnedGame(groupDto: GameOwnedDto) {
        await this.database.execute({
            sql: 'INSERT INTO OwnedGame (accountId, gameId) VALUES (?, ?)',
            args: [groupDto.accountId, groupDto.gameId],
        })
    }

    async addGameToCollection(accountId: number, gameId: number): Promise<{ success: boolean; wishlistRemoved: boolean }> {
        const transaction = await this.database.transaction('write')

        try {
            const ownedGame = await transaction.execute({
                sql: 'INSERT OR IGNORE INTO OwnedGame (accountId, gameId) VALUES (?, ?)',
                args: [accountId, gameId],
            })

            if (ownedGame.rowsAffected !== 1) {
                await transaction.commit()
                return { success: false, wishlistRemoved: false }
            }

            await transaction.execute({
                sql: 'INSERT INTO CollectionActivity (accountId, gameId, actionType, actionDetails) VALUES (?, ?, ?, ?)',
                args: [accountId, gameId, 'added', null],
            })

            const wishlist = await transaction.execute({
                sql: 'SELECT 1 FROM WishlistedGame WHERE accountId = ? AND gameId = ?',
                args: [accountId, gameId],
            })
            const wishlistRemoved = wishlist.rows.length > 0

            if (wishlistRemoved) {
                await transaction.execute({
                    sql: 'DELETE FROM WishlistedGame WHERE accountId = ? AND gameId = ?',
                    args: [accountId, gameId],
                })
                await transaction.execute({
                    sql: 'INSERT INTO CollectionActivity (accountId, gameId, actionType, actionDetails) VALUES (?, ?, ?, ?)',
                    args: [accountId, gameId, 'unwishlisted', null],
                })
            }

            // Keep the bounded activity-memory policy inside the same transaction
            // as the writes that produced the events.
            await transaction.execute({
                sql: `
                    DELETE FROM CollectionActivity
                    WHERE accountId = ?
                      AND id NOT IN (
                          SELECT id FROM CollectionActivity
                          WHERE accountId = ?
                          ORDER BY id DESC
                          LIMIT 32
                      )
                `,
                args: [accountId, accountId],
            })

            await transaction.commit()
            return { success: true, wishlistRemoved }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async removeGameFromCollection(accountId: number, gameId: number): Promise<{ rowsAffected: number }> {
        const transaction = await this.database.transaction('write')

        try {
            const ownedGame = await transaction.execute({
                sql: 'DELETE FROM OwnedGame WHERE accountId = ? AND gameId = ?',
                args: [accountId, gameId],
            })

            if (ownedGame.rowsAffected !== 1) {
                await transaction.commit()
                return { rowsAffected: 0 }
            }

            await transaction.execute({
                sql: 'INSERT INTO CollectionActivity (accountId, gameId, actionType, actionDetails) VALUES (?, ?, ?, ?)',
                args: [accountId, gameId, 'removed', null],
            })
            await transaction.execute({
                sql: `
                    DELETE FROM CollectionActivity
                    WHERE accountId = ?
                      AND id NOT IN (
                          SELECT id FROM CollectionActivity
                          WHERE accountId = ?
                          ORDER BY id DESC
                          LIMIT 32
                      )
                `,
                args: [accountId, accountId],
            })

            await transaction.commit()
            return { rowsAffected: 1 }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async updateGameOwnershipAndLogActivity(
        accountId: number,
        gameId: number,
        ownedGameDto: UpdateGameOwnedDto,
    ): Promise<{ rowsAffected: number }> {
        const fields: Array<string> = []
        const args: Array<string | number | null> = []

        if (ownedGameDto.purchaseDate !== undefined) {
            fields.push('purchaseDate = ?')
            args.push(ownedGameDto.purchaseDate)
        }

        if (ownedGameDto.purchaseNotes !== undefined) {
            fields.push('purchaseNotes = ?')
            args.push(ownedGameDto.purchaseNotes)
        }

        if (ownedGameDto.purchasePrice !== undefined) {
            fields.push('purchasePrice = ?')
            args.push(ownedGameDto.purchasePrice)
        }

        if (fields.length === 0) {
            throw new BadRequestException('No fields to update')
        }

        const transaction = await this.database.transaction('write')

        try {
            const ownedGame = await transaction.execute({
                sql: `UPDATE OwnedGame SET ${fields.join(', ')} WHERE accountId = ? AND gameId = ?`,
                args: [...args, accountId, gameId],
            })

            if (ownedGame.rowsAffected !== 1) {
                await transaction.commit()
                return { rowsAffected: 0 }
            }

            await transaction.execute({
                sql: 'INSERT INTO CollectionActivity (accountId, gameId, actionType, actionDetails) VALUES (?, ?, ?, ?)',
                args: [accountId, gameId, 'updated', null],
            })
            await transaction.execute({
                sql: `
                    DELETE FROM CollectionActivity
                    WHERE accountId = ?
                      AND id NOT IN (
                          SELECT id FROM CollectionActivity
                          WHERE accountId = ?
                          ORDER BY id DESC
                          LIMIT 32
                      )
                `,
                args: [accountId, accountId],
            })

            await transaction.commit()
            return { rowsAffected: 1 }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async toggleWishlistAndLogActivity(accountId: number, gameId: number): Promise<boolean> {
        const transaction = await this.database.transaction('write')

        try {
            const wishlist = await transaction.execute({
                sql: 'SELECT 1 FROM WishlistedGame WHERE accountId = ? AND gameId = ?',
                args: [accountId, gameId],
            })
            const isWishlisted = wishlist.rows.length > 0

            await transaction.execute({
                sql: isWishlisted
                    ? 'DELETE FROM WishlistedGame WHERE accountId = ? AND gameId = ?'
                    : 'INSERT INTO WishlistedGame (accountId, gameId) VALUES (?, ?)',
                args: [accountId, gameId],
            })
            await transaction.execute({
                sql: 'INSERT INTO CollectionActivity (accountId, gameId, actionType, actionDetails) VALUES (?, ?, ?, ?)',
                args: [accountId, gameId, isWishlisted ? 'unwishlisted' : 'wishlisted', null],
            })
            await transaction.execute({
                sql: `
                    DELETE FROM CollectionActivity
                    WHERE accountId = ?
                      AND id NOT IN (
                          SELECT id FROM CollectionActivity
                          WHERE accountId = ?
                          ORDER BY id DESC
                          LIMIT 32
                      )
                `,
                args: [accountId, accountId],
            })

            await transaction.commit()
            return !isWishlisted
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async saveGameReviewAndLogActivity(accountId: number, gameId: number, review: number): Promise<{ success: true }> {
        const transaction = await this.database.transaction('write')

        try {
            await transaction.execute({
                sql: 'DELETE FROM GameReview WHERE accountId = ? AND gameId = ?',
                args: [accountId, gameId],
            })
            await transaction.execute({
                sql: 'INSERT INTO GameReview (accountId, gameId, review) VALUES (?, ?, ?)',
                args: [accountId, gameId, review],
            })
            await transaction.execute({
                sql: 'INSERT INTO CollectionActivity (accountId, gameId, actionType, actionDetails) VALUES (?, ?, ?, ?)',
                args: [accountId, gameId, 'rated', JSON.stringify({ rating: review })],
            })
            await transaction.execute({
                sql: `
                    DELETE FROM CollectionActivity
                    WHERE accountId = ?
                      AND id NOT IN (
                          SELECT id FROM CollectionActivity
                          WHERE accountId = ?
                          ORDER BY id DESC
                          LIMIT 32
                      )
                `,
                args: [accountId, accountId],
            })

            await transaction.commit()
            return { success: true }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    updateGameOwned(accountId: number, gameId: number, ownedGameDto: UpdateGameOwnedDto) {
        const fields = []
        const args = []

        // we allow update to `null` values
        if (ownedGameDto.purchaseDate !== undefined) {
            fields.push('purchaseDate = ?')
            args.push(ownedGameDto.purchaseDate)
        }

        if (ownedGameDto.purchaseNotes !== undefined) {
            fields.push('purchaseNotes = ?')
            args.push(ownedGameDto.purchaseNotes)
        }

        if (ownedGameDto.purchasePrice !== undefined) {
            fields.push('purchasePrice = ?')
            args.push(ownedGameDto.purchasePrice)
        }

        if (fields.length === 0) {
            throw new BadRequestException('No fields to update')
        }

        args.push(accountId, gameId)

        const sql = `
          UPDATE OwnedGame
          SET ${fields.join(', ')}
          WHERE accountId = ? AND gameId = ?
        `

        return this.database.execute({ sql, args })
    }

    deleteOwnedGameById(accountId: number, gameId: number) {
        return this.database.execute({
            sql: 'DELETE FROM OwnedGame WHERE accountId = ? AND gameId = ?',
            args: [accountId, gameId],
        })
    }

    getGameReviews() {
        return this.database.execute('SELECT * FROM GameReview')
    }

    getGameReviewById(accountId: number, gameId: number) {
        return this.database.execute({
            sql: 'SELECT * FROM GameReview WHERE accountId = ? AND gameId = ?',
            args: [accountId, gameId],
        })
    }

    getGameReviewsByAccountId(accountId: number) {
        return this.database.execute({
            sql: 'SELECT * FROM GameReview WHERE accountId = ?',
            args: [accountId],
        })
    }

    createGameReview(accountId: number, gameId: number, review: number) {
        return this.database.execute({
            sql: 'INSERT INTO GameReview (accountId, gameId, review) VALUES (?, ?, ?)',
            args: [accountId, gameId, review],
        })
    }

    deleteGameReviewById(accountId: number, gameId: number) {
        return this.database.execute({
            sql: 'DELETE FROM GameReview WHERE accountId = ? AND gameId = ?',
            args: [accountId, gameId],
        })
    }

    getAvgGlobalRating(gameId: number) {
        return this.database.execute({
            sql: `
            SELECT
                AVG(review) as avgGlobalRating,
                COUNT(review) as count
            FROM GameReview
            WHERE gameId = ?`,
            args: [gameId],
        })
    }

    // The average rating of the game from the groups the user is a member of
    getAvgGroupsRating(accountId: number, gameId: number) {
        return this.database.execute({
            sql: `
            SELECT
                AVG(gr.review) AS avgGroupsRating,
                COUNT(gr.review) AS count
            FROM GameReview gr
            JOIN GroupMembership gm ON gr.accountId = gm.accountId  -- Link review to group membership
            JOIN GroupMembership gm2 ON gm.groupId = gm2.groupId  -- Find groups user is also in
            WHERE gm2.accountId = ?  -- Filter: user must be in the same group
            AND gr.gameId = ?;  -- Filter: only for the specific game`,
            args: [accountId, gameId],
        })
    }

    getUserCollectionActivities(accountId: number) {
        return this.database.execute({
            sql: 'SELECT * FROM CollectionActivity WHERE accountId = ?',
            args: [accountId],
        })
    }

    deleteCollectionActivityById(activityId: number) {
        return this.database.execute({
            sql: 'DELETE FROM CollectionActivity WHERE id = ?',
            args: [activityId],
        })
    }

    createCollectionActivity(collectionActivityDto: Omit<CollectionActivityDto, 'id'>) {
        return this.database.execute({
            sql: 'INSERT INTO CollectionActivity (accountId, gameId, actionType, actionDetails) VALUES (?, ?, ?, ?)',
            args: [
                collectionActivityDto.accountId,
                collectionActivityDto.gameId,
                collectionActivityDto.actionType,
                collectionActivityDto.actionDetails ? JSON.stringify(collectionActivityDto.actionDetails) : null,
            ],
        })
    }

    getWishlistByAccountId(accountId: number) {
        return this.database.execute({
            sql: `SELECT * FROM WishlistedGame w WHERE w.accountId = ?`,
            args: [accountId],
        })
    }

    getWishlistById(accountId: number, gameId: number) {
        return this.database.execute({
            sql: 'SELECT * FROM WishlistedGame WHERE accountId = ? AND gameId = ?',
            args: [accountId, gameId],
        })
    }

    addGameToWishlist(accountId: number, gameId: number) {
        return this.database.execute({
            sql: 'INSERT INTO WishlistedGame (accountId, gameId) VALUES (?, ?)',
            args: [accountId, gameId],
        })
    }

    removeGameFromWishlist(accountId: number, gameId: number) {
        return this.database.execute({
            sql: 'DELETE FROM WishlistedGame WHERE accountId = ? AND gameId = ?',
            args: [accountId, gameId],
        })
    }
}
