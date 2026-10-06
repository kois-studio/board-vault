import { BadRequestException, NotFoundException } from '@nestjs/common'

import { containsPattern, LIKE_ESCAPE } from '../like-pattern.js'

import type { ClerkGroupInvitationMetadata } from '../../../../common/types/clerk-invitation.type.js'
import type { GroupGameInterestBody } from '../../../../common/types/group-game-interest.type.js'
import type { CreateGroupMembershipBody } from '../../../../common/types/group-membership.type.js'
import type {
    CreateGroupPersonBody,
    GroupPersonGameOwnershipDto,
    GroupPersonGamePreferenceDto,
    UpdateGroupPersonBody,
} from '../../../../common/types/group-person.type.js'
import type { CreateGroupBody, UpdateGroupBody } from '../../../../common/types/group.type.js'
import type { DatabaseService } from '../database.service.js'

/** Groups, memberships, group people, and acquisition interest. */
export class GroupQueries {
    constructor(private readonly database: DatabaseService) {}

    async joinGroupFromClerkInvitation(accountId: number, metadata: ClerkGroupInvitationMetadata) {
        const transaction = await this.database.transaction('write')

        try {
            const group = await transaction.execute({
                sql: 'SELECT id FROM UserGroup WHERE id = ? AND createdBy = ?',
                args: [metadata.groupId, metadata.inviterAccountId],
            })

            if (group.rows.length === 0) {
                throw new NotFoundException('The group invitation is no longer valid')
            }

            await transaction.execute({
                sql: 'INSERT OR IGNORE INTO GroupMembership (accountId, groupId) VALUES (?, ?)',
                args: [accountId, metadata.groupId],
            })

            if (metadata.groupPersonId === undefined) {
                await transaction.execute({
                    sql: `
                        INSERT INTO GroupPerson (groupId, accountId, kind, status, displayName, avatar, createdByAccountId, claimedAt)
                        SELECT ?, a.id, 'linked', 'active', COALESCE(NULLIF(a.displayName, ''), a.username), a.avatar, ug.createdBy, CURRENT_TIMESTAMP
                        FROM Account a
                        INNER JOIN UserGroup ug ON ug.id = ?
                        WHERE a.id = ?
                          AND NOT EXISTS (
                              SELECT 1
                              FROM GroupPerson existing
                              WHERE existing.groupId = ? AND existing.accountId = ?
                          )
                    `,
                    args: [metadata.groupId, metadata.groupId, accountId, metadata.groupId, accountId],
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

    getGroupsForAccount(accountId: number) {
        return this.database.execute({
            sql: `
                SELECT DISTINCT ug.*
                FROM UserGroup ug
                LEFT JOIN GroupMembership gm ON gm.groupId = ug.id
                WHERE ug.createdBy = ? OR gm.accountId = ?
            `,
            args: [accountId, accountId],
        })
    }

    getGroupById(id: number) {
        return this.database.execute({
            sql: 'SELECT * FROM UserGroup WHERE id = ?',
            args: [id],
        })
    }

    getGroupByName(name: string) {
        return this.database.execute({
            sql: 'SELECT * FROM UserGroup WHERE name = ?',
            args: [name],
        })
    }

    async createGroup(groupDto: CreateGroupBody) {
        await this.database.execute({
            sql: 'INSERT INTO UserGroup (name, createdBy) VALUES (?, ?)',
            args: [groupDto.name, groupDto.createdBy],
        })
    }

    async createGroupWithMembership(groupDto: CreateGroupBody) {
        const transaction = await this.database.transaction('write')

        try {
            const groupResult = await transaction.execute({
                sql: 'INSERT INTO UserGroup (name, createdBy) VALUES (?, ?)',
                args: [groupDto.name, groupDto.createdBy],
            })
            const groupId = Number(groupResult.lastInsertRowid)

            await transaction.execute({
                sql: 'INSERT INTO GroupMembership (accountId, groupId) VALUES (?, ?)',
                args: [groupDto.createdBy, groupId],
            })

            await transaction.execute({
                sql: `
                    INSERT INTO GroupPerson (groupId, accountId, kind, status, displayName, avatar, createdByAccountId, claimedAt)
                    SELECT ?, a.id, 'linked', 'active', COALESCE(NULLIF(a.displayName, ''), a.username), a.avatar, ?, CURRENT_TIMESTAMP
                    FROM Account a
                    WHERE a.id = ?
                `,
                args: [groupId, groupDto.createdBy, groupDto.createdBy],
            })

            await transaction.commit()
            return { groupId }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async updateGroup(id: number, partialGroupDto: UpdateGroupBody) {
        // Array to store fields to update
        const fields = []
        const args = []

        // Dynamically build the update query based on the provided properties
        if (partialGroupDto.name) {
            fields.push('name = ?')
            args.push(partialGroupDto.name)
        }

        // Error if no fields are provided
        if (fields.length === 0) {
            throw new BadRequestException('No fields to update')
        }

        // Add user id as the last argument
        args.push(id)

        // Construct the final query
        const sql = `
          UPDATE UserGroup
          SET ${fields.join(', ')}
          WHERE id = ?
        `

        // Execute the query
        await this.database.execute({ sql, args })

        // Return the updated user
        return this.getGroupById(id)
    }

    deleteGroupById(id: number) {
        return this.database.execute({
            sql: 'DELETE FROM UserGroup WHERE id = ?',
            args: [id],
        })
    }

    getGroupMemberships() {
        return this.database.execute('SELECT * FROM GroupMembership')
    }

    getGroupMembershipById(accountId: number, groupId: number) {
        return this.database.execute({
            sql: 'SELECT * FROM GroupMembership WHERE accountId = ? AND groupId = ?',
            args: [accountId, groupId],
        })
    }

    getGroupMembershipsByAccountId(accountId: number) {
        return this.database.execute({
            sql: 'SELECT * FROM GroupMembership WHERE accountId = ?',
            args: [accountId],
        })
    }

    getGroupMembershipsByGroupId(groupId: number) {
        return this.database.execute({
            sql: 'SELECT * FROM GroupMembership WHERE groupId = ?',
            args: [groupId],
        })
    }

    async getGroupMemberIds(groupId: number): Promise<Array<number>> {
        const resultSet = await this.database.execute({
            sql: 'SELECT accountId FROM GroupMembership WHERE groupId = ?',
            args: [groupId],
        })

        return resultSet.rows.map(row => Number(row[0]))
    }

    async getGroupAvailableGameIds(groupId: number): Promise<Array<number>> {
        const resultSet = await this.database.execute({
            sql: `
                SELECT DISTINCT gameId
                FROM (
                    SELECT og.gameId
                    FROM OwnedGame og
                    INNER JOIN GroupMembership gm ON gm.accountId = og.accountId
                    WHERE gm.groupId = ?
                    UNION
                    SELECT gpo.gameId
                    FROM GroupPersonGameOwnership gpo
                    INNER JOIN GroupPerson gp ON gp.id = gpo.groupPersonId
                    WHERE gp.groupId = ? AND gp.status = 'active' AND gpo.status = 'asserted'
                ) available
            `,
            args: [groupId, groupId],
        })

        return resultSet.rows.map(row => Number(row[0]))
    }

    async getGroupAvailableGameIdsForPeople(groupId: number, groupPersonIds: Array<number>): Promise<Array<number>> {
        if (groupPersonIds.length === 0) return []

        const placeholders = groupPersonIds.map(() => '?').join(', ')
        const resultSet = await this.database.execute({
            sql: `
                SELECT DISTINCT gameId
                FROM (
                    SELECT gpo.gameId
                    FROM GroupPersonGameOwnership gpo
                    INNER JOIN GroupPerson gp ON gp.id = gpo.groupPersonId
                    WHERE gp.groupId = ? AND gp.status = 'active'
                      AND gp.id IN (${placeholders}) AND gpo.status = 'asserted'
                    UNION
                    SELECT og.gameId
                    FROM OwnedGame og
                    INNER JOIN GroupPerson gp ON gp.accountId = og.accountId
                    WHERE gp.groupId = ? AND gp.status = 'active'
                      AND gp.id IN (${placeholders})
                ) available
            `,
            args: [groupId, ...groupPersonIds, groupId, ...groupPersonIds],
        })

        return resultSet.rows.map(row => Number(row[0]))
    }

    getActivePlaceholdersByGroupIds(groupIds: Array<number>) {
        return this.database.execute({
            sql: `
                SELECT id, groupId, displayName, avatar
                FROM GroupPerson
                WHERE groupId IN (${groupIds.map(() => '?').join(', ')}) AND kind = 'placeholder' AND status = 'active'
                ORDER BY groupId, displayName
            `,
            args: groupIds,
        })
    }

    getAssertedOwnershipByGroupIds(groupIds: Array<number>) {
        return this.database.execute({
            sql: `
                SELECT o.groupPersonId, o.gameId
                FROM GroupPersonGameOwnership o
                INNER JOIN GroupPerson gp ON gp.id = o.groupPersonId
                WHERE gp.groupId IN (${groupIds.map(() => '?').join(', ')}) AND o.status = 'asserted'
            `,
            args: groupIds,
        })
    }

    getGroupPeople(groupId: number, includeArchived = false) {
        return this.database.execute({
            sql: `
                SELECT
                    gp.id,
                    gp.groupId,
                    gp.accountId,
                    gp.kind,
                    gp.status,
                    gp.displayName,
                    gp.avatar,
                    gp.createdAt,
                    gp.updatedAt,
                    gp.claimedAt
                FROM GroupPerson gp
                WHERE gp.groupId = ? ${includeArchived ? '' : "AND gp.status = 'active'"}
                ORDER BY gp.status ASC, gp.displayName COLLATE NOCASE ASC, gp.id ASC
            `,
            args: [groupId],
        })
    }

    getClaimableGroupPersonIds(groupId: number, email: string) {
        return this.database.execute({
            sql: `
                SELECT id
                FROM GroupPerson
                WHERE groupId = ? AND status = 'active' AND kind = 'placeholder'
                  AND accountId IS NULL AND claimEmail IS NOT NULL
                  AND claimExpiresAt > CURRENT_TIMESTAMP
                  AND lower(claimEmail) = lower(?)
                ORDER BY id ASC
            `,
            args: [groupId, email],
        })
    }

    getGroupPersonGameCatalog(search: string, limit = 100) {
        const normalizedSearch = search.trim().toLowerCase()

        return this.database.execute({
            sql: `
                SELECT
                    g.id,
                    g.imageUrl,
                    g.gameAvgDuration,
                    g.minPlayers,
                    g.maxPlayers,
                    COALESCE(gt_en.title, gt_es.title) AS title,
                    COALESCE(gt_en.title, '') AS titleEn,
                    COALESCE(gt_es.title, '') AS titleEs
                FROM Game g
                LEFT JOIN GameTranslation gt_en ON gt_en.gameId = g.id AND gt_en.languageCode = 'en'
                LEFT JOIN GameTranslation gt_es ON gt_es.gameId = g.id AND gt_es.languageCode = 'es'
                WHERE COALESCE(gt_en.title, gt_es.title) IS NOT NULL
                  AND (? = '' OR lower(COALESCE(gt_en.normalizedTitle, gt_es.normalizedTitle, '')) LIKE ? ${LIKE_ESCAPE})
                ORDER BY lower(COALESCE(gt_en.title, gt_es.title)), g.id ASC
                LIMIT ?
            `,
            args: [normalizedSearch, containsPattern(normalizedSearch), Math.min(Math.max(limit, 1), 100)],
        })
    }

    getGroupPersonById(groupPersonId: number, groupId: number) {
        return this.database.execute({
            sql: 'SELECT id, groupId, accountId, kind, status, displayName, avatar, createdAt, updatedAt, claimedAt FROM GroupPerson WHERE id = ? AND groupId = ?',
            args: [groupPersonId, groupId],
        })
    }

    async createGroupPerson(groupId: number, createdByAccountId: number, body: CreateGroupPersonBody) {
        return this.database.execute({
            sql: `
                INSERT INTO GroupPerson (groupId, kind, status, displayName, avatar, createdByAccountId)
                VALUES (?, 'placeholder', 'active', ?, ?, ?)
            `,
            args: [groupId, body.displayName, body.avatar ? JSON.stringify(body.avatar) : null, createdByAccountId],
        })
    }

    createLinkedGroupPerson(groupId: number, accountId: number, displayName: string, avatar: string | null) {
        return this.database.execute({
            sql: `
                INSERT INTO GroupPerson (groupId, accountId, kind, status, displayName, avatar, createdByAccountId, claimedAt)
                SELECT ?, ?, 'linked', 'active', ?, ?, ?, CURRENT_TIMESTAMP
                WHERE EXISTS (SELECT 1 FROM GroupMembership WHERE groupId = ? AND accountId = ?)
                  AND NOT EXISTS (SELECT 1 FROM GroupPerson WHERE groupId = ? AND accountId = ?)
            `,
            args: [groupId, accountId, displayName, avatar ?? null, accountId, groupId, accountId, groupId, accountId],
        })
    }

    getLinkedGroupPersonByAccount(groupId: number, accountId: number) {
        return this.database.execute({
            sql: "SELECT id, groupId, accountId, kind, status, displayName, avatar, createdAt, updatedAt, claimedAt FROM GroupPerson WHERE groupId = ? AND accountId = ? AND kind = 'linked'",
            args: [groupId, accountId],
        })
    }

    updateGroupPerson(groupPersonId: number, groupId: number, body: UpdateGroupPersonBody) {
        const fields: Array<string> = []
        const args: Array<string | number | null> = []

        if (body.displayName !== undefined) {
            fields.push('displayName = ?')
            args.push(body.displayName)
        }
        if (body.avatar !== undefined) {
            fields.push('avatar = ?')
            args.push(body.avatar ? JSON.stringify(body.avatar) : null)
        }
        if (body.status !== undefined) {
            fields.push('status = ?')
            args.push(body.status)
        }

        if (fields.length === 0) {
            throw new BadRequestException('No group person fields to update')
        }

        fields.push('updatedAt = CURRENT_TIMESTAMP')
        args.push(groupPersonId, groupId)

        return this.database.execute({
            sql: `UPDATE GroupPerson SET ${fields.join(', ')} WHERE id = ? AND groupId = ?`,
            args,
        })
    }

    setGroupPersonClaimEmail(groupPersonId: number, groupId: number, claimEmail: string) {
        return this.database.execute({
            sql: `UPDATE GroupPerson SET claimEmail = ?, claimExpiresAt = datetime('now', '+30 days'), updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND groupId = ? AND kind = 'placeholder' AND accountId IS NULL`,
            args: [claimEmail.toLowerCase(), groupPersonId, groupId],
        })
    }

    clearGroupPersonClaimEmail(groupPersonId: number, groupId: number, claimEmail?: string) {
        return this.database.execute({
            sql: `
                UPDATE GroupPerson
                SET claimEmail = NULL, claimExpiresAt = NULL, updatedAt = CURRENT_TIMESTAMP
                WHERE id = ? AND groupId = ? AND kind = 'placeholder' AND accountId IS NULL
                  ${claimEmail === undefined ? '' : 'AND lower(claimEmail) = lower(?)'}
            `,
            args: claimEmail === undefined ? [groupPersonId, groupId] : [groupPersonId, groupId, claimEmail],
        })
    }

    async claimGroupPerson(input: {
        groupId: number
        groupPersonId: number
        accountId: number
        email: string
        keepOwnershipGameIds: Array<number>
        keepPreferenceGameIds: Array<number>
        importOwnershipToCollection: boolean
    }): Promise<{ claimed: boolean; alreadyClaimed: boolean }> {
        const transaction = await this.database.transaction('write')

        try {
            const candidate = await transaction.execute({
                sql: `
                    SELECT id, accountId, kind
                    FROM GroupPerson
                    WHERE id = ? AND groupId = ? AND status = 'active'
                      AND kind = 'placeholder' AND accountId IS NULL
                      AND claimEmail IS NOT NULL AND claimExpiresAt > CURRENT_TIMESTAMP
                      AND lower(claimEmail) = lower(?)
                `,
                args: [input.groupPersonId, input.groupId, input.email],
            })

            if (candidate.rows.length === 0) {
                const existing = await transaction.execute({
                    sql: 'SELECT accountId FROM GroupPerson WHERE id = ? AND groupId = ?',
                    args: [input.groupPersonId, input.groupId],
                })

                await transaction.commit()
                return { claimed: false, alreadyClaimed: Number(existing.rows[0]?.[0] ?? 0) === input.accountId }
            }

            const ownership = await transaction.execute({
                sql: "SELECT gameId FROM GroupPersonGameOwnership WHERE groupPersonId = ? AND status = 'asserted'",
                args: [input.groupPersonId],
            })
            const preferences = await transaction.execute({
                sql: 'SELECT gameId FROM GroupPersonGamePreference WHERE groupPersonId = ?',
                args: [input.groupPersonId],
            })
            const keepOwnership = new Set(input.keepOwnershipGameIds)
            const keepPreferences = new Set(input.keepPreferenceGameIds)

            const update = await transaction.execute({
                sql: `
                    UPDATE GroupPerson
                    SET accountId = ?, kind = 'linked', claimEmail = NULL, claimExpiresAt = NULL,
                        claimedAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP
                    WHERE id = ? AND groupId = ? AND kind = 'placeholder' AND accountId IS NULL
                `,
                args: [input.accountId, input.groupPersonId, input.groupId],
            })

            if (update.rowsAffected !== 1) {
                await transaction.rollback()
                return { claimed: false, alreadyClaimed: false }
            }

            await transaction.batch(
                ownership.rows.map(row => ({
                    sql: `
                        UPDATE GroupPersonGameOwnership
                        SET status = ?, source = 'claimed_import', enteredByAccountId = ?, updatedAt = CURRENT_TIMESTAMP
                        WHERE groupPersonId = ? AND gameId = ?
                    `,
                    args: [
                        keepOwnership.has(Number(row[0])) ? 'asserted' : 'rejected',
                        input.accountId,
                        input.groupPersonId,
                        Number(row[0]),
                    ],
                })),
            )
            await transaction.batch(
                preferences.rows
                    .filter(row => !keepPreferences.has(Number(row[0])))
                    .map(row => ({
                        sql: 'DELETE FROM GroupPersonGamePreference WHERE groupPersonId = ? AND gameId = ?',
                        args: [input.groupPersonId, Number(row[0])],
                    })),
            )

            if (input.importOwnershipToCollection && input.keepOwnershipGameIds.length > 0) {
                await transaction.batch(
                    input.keepOwnershipGameIds.map(gameId => ({
                        sql: 'INSERT OR IGNORE INTO OwnedGame (accountId, gameId) VALUES (?, ?)',
                        args: [input.accountId, gameId],
                    })),
                )
            }

            await transaction.commit()
            return { claimed: true, alreadyClaimed: false }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    getGroupPersonOwnership(groupPersonId: number, groupId: number) {
        return this.database.execute({
            sql: `
                SELECT o.gameId, o.status, o.source, o.enteredByAccountId,
                       o.confirmedByAccountId, o.createdAt, o.updatedAt
                FROM GroupPersonGameOwnership o
                INNER JOIN GroupPerson gp ON gp.id = o.groupPersonId AND gp.groupId = ?
                WHERE o.groupPersonId = ?
                UNION ALL
                SELECT og.gameId, 'asserted', 'account_collection', gp.accountId,
                       NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                FROM GroupPerson gp
                INNER JOIN OwnedGame og ON og.accountId = gp.accountId
                WHERE gp.id = ? AND gp.groupId = ? AND gp.kind = 'linked'
                  AND NOT EXISTS (
                      SELECT 1
                      FROM GroupPersonGameOwnership existing
                      WHERE existing.groupPersonId = gp.id AND existing.gameId = og.gameId
                  )
                ORDER BY gameId ASC
            `,
            args: [groupId, groupPersonId, groupPersonId, groupId],
        })
    }

    upsertGroupPersonOwnership(
        groupPersonId: number,
        gameId: number,
        enteredByAccountId: number,
        status: GroupPersonGameOwnershipDto['status'],
    ) {
        return this.database.execute({
            sql: `
                INSERT INTO GroupPersonGameOwnership
                    (groupPersonId, gameId, status, source, enteredByAccountId, updatedAt)
                VALUES (?, ?, ?, 'placeholder_setup', ?, CURRENT_TIMESTAMP)
                ON CONFLICT(groupPersonId, gameId) DO UPDATE SET
                    status = excluded.status,
                    source = excluded.source,
                    enteredByAccountId = excluded.enteredByAccountId,
                    updatedAt = CURRENT_TIMESTAMP
            `,
            args: [groupPersonId, gameId, status, enteredByAccountId],
        })
    }

    getGroupPersonPreferences(groupPersonId: number, groupId: number) {
        return this.database.execute({
            sql: `
                SELECT p.gameId, p.preference, p.source, p.enteredByAccountId, p.createdAt, p.updatedAt
                FROM GroupPersonGamePreference p
                INNER JOIN GroupPerson gp ON gp.id = p.groupPersonId AND gp.groupId = ?
                WHERE p.groupPersonId = ?
                ORDER BY p.gameId ASC
            `,
            args: [groupId, groupPersonId],
        })
    }

    upsertGroupPersonPreference(
        groupPersonId: number,
        gameId: number,
        enteredByAccountId: number,
        preference: GroupPersonGamePreferenceDto['preference'],
    ) {
        return this.database.execute({
            sql: `
                INSERT INTO GroupPersonGamePreference
                    (groupPersonId, gameId, preference, source, enteredByAccountId, updatedAt)
                VALUES (?, ?, ?, 'placeholder_setup', ?, CURRENT_TIMESTAMP)
                ON CONFLICT(groupPersonId, gameId) DO UPDATE SET
                    preference = excluded.preference,
                    source = excluded.source,
                    enteredByAccountId = excluded.enteredByAccountId,
                    updatedAt = CURRENT_TIMESTAMP
            `,
            args: [groupPersonId, gameId, preference, enteredByAccountId],
        })
    }

    deleteGroupPersonPreference(groupPersonId: number, groupId: number, gameId: number) {
        return this.database.execute({
            sql: `
                DELETE FROM GroupPersonGamePreference
                WHERE groupPersonId = ?
                  AND gameId = ?
                  AND EXISTS (SELECT 1 FROM GroupPerson WHERE id = ? AND groupId = ?)
            `,
            args: [groupPersonId, gameId, groupPersonId, groupId],
        })
    }

    /**
     * Standings, play counts and never-played games from the group's completed
     * game nights: four reads for the whole group, however many people it has.
     */
    async getGroupInsights(groupId: number) {
        // Who played what, once per person: a group person linked to an account counts as the account.
        const completedPlays = `
            WITH completed AS (SELECT id FROM Meet WHERE groupId = ? AND status = 'completed'),
            plays AS (
                SELECT mag.meetId, mag.gameId, mag.accountId, NULL AS personId
                FROM MeetAccountGame mag
                JOIN completed c ON c.id = mag.meetId
                UNION
                SELECT mpg.meetId, mpg.gameId, gp.accountId, CASE WHEN gp.accountId IS NULL THEN gp.id END
                FROM MeetPersonGame mpg
                JOIN completed c ON c.id = mpg.meetId
                JOIN GroupPerson gp ON gp.id = mpg.groupPersonId
            ),
            wins AS (
                SELECT DISTINCT r.meetId, r.gameId, COALESCE(r.accountId, gp.accountId) AS accountId,
                    CASE WHEN COALESCE(r.accountId, gp.accountId) IS NULL THEN r.groupPersonId END AS personId
                FROM MeetGameResult r
                JOIN completed c ON c.id = r.meetId
                LEFT JOIN GroupPerson gp ON gp.id = r.groupPersonId
                WHERE r.isWinner = 1
            )`
        const gameColumns = `g.id, g.imageUrl, g.gameAvgDuration, g.minPlayers, g.maxPlayers, gt_en.title, gt_es.title`
        const gameTitles = `
            LEFT JOIN GameTranslation gt_en ON gt_en.gameId = g.id AND gt_en.languageCode = 'en'
            LEFT JOIN GameTranslation gt_es ON gt_es.gameId = g.id AND gt_es.languageCode = 'es'`

        const [totals, standings, mostPlayed, neverPlayed] = await Promise.all([
            this.database.execute({
                sql: `${completedPlays}
                    SELECT
                        (SELECT COUNT(*) FROM completed),
                        (SELECT COUNT(*) FROM MeetGame mg JOIN completed c ON c.id = mg.meetId WHERE mg.gameStatus = 'played'),
                        (SELECT COUNT(*) FROM (SELECT DISTINCT meetId, gameId FROM wins))`,
                args: [groupId],
            }),
            this.database.execute({
                sql: `${completedPlays},
                    standings AS (
                        SELECT p.accountId, p.personId, COUNT(DISTINCT p.meetId) AS sessions, COUNT(*) AS gamesPlayed
                        FROM plays p
                        GROUP BY p.accountId, p.personId
                    ),
                    win_counts AS (
                        SELECT accountId, personId, COUNT(*) AS wins FROM wins GROUP BY accountId, personId
                    )
                    SELECT
                        s.accountId,
                        gp.id,
                        COALESCE(gp.displayName, NULLIF(a.displayName, ''), a.username) AS displayName,
                        COALESCE(gp.avatar, a.avatar),
                        s.sessions,
                        s.gamesPlayed,
                        COALESCE(w.wins, 0) AS wins
                    FROM standings s
                    LEFT JOIN win_counts w ON w.accountId IS s.accountId AND w.personId IS s.personId
                    LEFT JOIN Account a ON a.id = s.accountId
                    LEFT JOIN GroupPerson gp ON gp.groupId = ?
                        AND ((s.accountId IS NOT NULL AND gp.accountId = s.accountId) OR (s.accountId IS NULL AND gp.id = s.personId))
                    ORDER BY wins DESC, s.gamesPlayed DESC, displayName COLLATE NOCASE`,
                args: [groupId, groupId],
            }),
            this.database.execute({
                sql: `
                    SELECT ${gameColumns}, COUNT(*) AS sessions, MAX(m.meetDate) AS lastPlayedAt
                    FROM MeetGame mg
                    JOIN Meet m ON m.id = mg.meetId AND m.groupId = ? AND m.status = 'completed'
                    JOIN Game g ON g.id = mg.gameId
                    ${gameTitles}
                    WHERE mg.gameStatus = 'played'
                    GROUP BY g.id
                    ORDER BY sessions DESC, lastPlayedAt DESC
                    LIMIT 5`,
                args: [groupId],
            }),
            this.database.execute({
                sql: `
                    WITH shelf AS (
                        SELECT og.gameId
                        FROM OwnedGame og
                        JOIN GroupMembership gm ON gm.accountId = og.accountId AND gm.groupId = ?
                        UNION
                        SELECT gpo.gameId
                        FROM GroupPersonGameOwnership gpo
                        JOIN GroupPerson gp ON gp.id = gpo.groupPersonId AND gp.groupId = ? AND gp.status = 'active'
                        WHERE gpo.status = 'asserted'
                    )
                    SELECT ${gameColumns}, COUNT(*) OVER () AS total
                    FROM shelf s
                    JOIN Game g ON g.id = s.gameId
                    ${gameTitles}
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM MeetGame mg
                        JOIN Meet m ON m.id = mg.meetId AND m.groupId = ? AND m.status = 'completed'
                        WHERE mg.gameId = s.gameId AND mg.gameStatus = 'played'
                    )
                    ORDER BY COALESCE(gt_en.title, gt_es.title) COLLATE NOCASE
                    LIMIT 12`,
                args: [groupId, groupId, groupId],
            }),
        ])

        return { totals, standings, mostPlayed, neverPlayed }
    }

    getGroupAcquisitionBoard(groupId: number) {
        return this.database.execute({
            sql: `
                SELECT
                    g.id,
                    g.imageUrl,
                    g.gameAvgDuration,
                    g.minPlayers,
                    g.maxPlayers,
                    gt_en.title,
                    gt_es.title,
                    (
                        SELECT MIN(ggi_first.createdAt)
                        FROM GroupGameInterest ggi_first
                        WHERE ggi_first.groupId = ? AND ggi_first.gameId = g.id
                    ) AS firstInterestedAt,
                    a.id,
                    a.username,
                    a.displayName,
                    a.avatar,
                    (
                        SELECT COUNT(DISTINCT ggi_count.accountId)
                        FROM GroupGameInterest ggi_count
                        WHERE ggi_count.groupId = ? AND ggi_count.gameId = g.id
                    ) AS interestCount,
                    (
                        SELECT COUNT(DISTINCT gp.id)
                        FROM GroupPerson gp
                        WHERE gp.groupId = ? AND gp.status = 'active'
                          AND (
                              EXISTS (
                                  SELECT 1
                                  FROM OwnedGame og
                                  WHERE og.accountId = gp.accountId AND og.gameId = g.id
                              )
                              OR EXISTS (
                                  SELECT 1
                                  FROM GroupPersonGameOwnership gpo
                                  WHERE gpo.groupPersonId = gp.id AND gpo.gameId = g.id AND gpo.status = 'asserted'
                              )
                          )
                    ) AS ownerCount,
                    gad.status,
                    gad.decidedAt,
                    decisionAccount.id,
                    decisionAccount.username,
                    decisionAccount.displayName,
                    decisionAccount.avatar
                FROM GroupGameInterest ggi
                INNER JOIN Game g ON g.id = ggi.gameId
                INNER JOIN Account a ON a.id = ggi.accountId
                LEFT JOIN GameTranslation gt_en ON gt_en.gameId = g.id AND gt_en.languageCode = 'en'
                LEFT JOIN GameTranslation gt_es ON gt_es.gameId = g.id AND gt_es.languageCode = 'es'
                LEFT JOIN GroupAcquisitionDecision gad ON gad.groupId = ggi.groupId AND gad.gameId = ggi.gameId
                LEFT JOIN Account decisionAccount ON decisionAccount.id = gad.decidedBy AND decisionAccount.isDeleted = 0
                WHERE ggi.groupId = ?
                    AND NOT EXISTS (
                        SELECT 1
                        FROM OwnedGame ownedByGroupMember
                        INNER JOIN GroupMembership groupMember ON groupMember.accountId = ownedByGroupMember.accountId
                        WHERE groupMember.groupId = ggi.groupId AND ownedByGroupMember.gameId = ggi.gameId
                    )
                    AND NOT EXISTS (
                        SELECT 1
                        FROM GroupPersonGameOwnership ownedByGroupPerson
                        INNER JOIN GroupPerson groupPerson ON groupPerson.id = ownedByGroupPerson.groupPersonId
                        WHERE groupPerson.groupId = ggi.groupId
                          AND groupPerson.status = 'active'
                          AND ownedByGroupPerson.gameId = ggi.gameId
                          AND ownedByGroupPerson.status = 'asserted'
                    )
                ORDER BY firstInterestedAt ASC, g.id ASC, a.displayName ASC
            `,
            args: [groupId, groupId, groupId, groupId],
        })
    }

    addGroupGameInterest(groupId: number, accountId: number, body: GroupGameInterestBody) {
        return this.database.execute({
            sql: `
                INSERT OR IGNORE INTO GroupGameInterest (groupId, accountId, gameId)
                SELECT ?, ?, ?
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM OwnedGame ownedByGroupMember
                    INNER JOIN GroupMembership groupMember ON groupMember.accountId = ownedByGroupMember.accountId
                    WHERE groupMember.groupId = ? AND ownedByGroupMember.gameId = ?
                )
                AND NOT EXISTS (
                    SELECT 1
                    FROM GroupPersonGameOwnership ownedByGroupPerson
                    INNER JOIN GroupPerson groupPerson ON groupPerson.id = ownedByGroupPerson.groupPersonId
                    WHERE groupPerson.groupId = ?
                      AND groupPerson.status = 'active'
                      AND ownedByGroupPerson.gameId = ?
                      AND ownedByGroupPerson.status = 'asserted'
                )
            `,
            args: [groupId, accountId, body.gameId, groupId, body.gameId, groupId, body.gameId],
        })
    }

    async addGroupGameInterestAndReopenDecision(groupId: number, accountId: number, gameId: number): Promise<{ rowsAffected: number }> {
        const transaction = await this.database.transaction('write')

        try {
            const interest = await transaction.execute({
                sql: `
                    INSERT OR IGNORE INTO GroupGameInterest (groupId, accountId, gameId)
                    SELECT ?, ?, ?
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM OwnedGame ownedByGroupMember
                    INNER JOIN GroupMembership groupMember ON groupMember.accountId = ownedByGroupMember.accountId
                    WHERE groupMember.groupId = ? AND ownedByGroupMember.gameId = ?
                )
                AND NOT EXISTS (
                    SELECT 1
                    FROM GroupPersonGameOwnership ownedByGroupPerson
                    INNER JOIN GroupPerson groupPerson ON groupPerson.id = ownedByGroupPerson.groupPersonId
                    WHERE groupPerson.groupId = ?
                      AND groupPerson.status = 'active'
                      AND ownedByGroupPerson.gameId = ?
                      AND ownedByGroupPerson.status = 'asserted'
                )
            `,
                args: [groupId, accountId, gameId, groupId, gameId, groupId, gameId],
            })

            if (interest.rowsAffected === 1) {
                await transaction.execute({
                    sql: `
                        UPDATE GroupAcquisitionDecision
                        SET status = 'open', decidedBy = NULL, decidedAt = NULL, note = NULL
                        WHERE groupId = ? AND gameId = ? AND status = 'not_now'
                    `,
                    args: [groupId, gameId],
                })
            }

            await transaction.commit()
            return { rowsAffected: interest.rowsAffected }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    upsertGroupAcquisitionDecision(
        groupId: number,
        gameId: number,
        decidedBy: number,
        status: 'open' | 'planned' | 'not_now',
        note: string | null,
    ) {
        return this.database.execute({
            sql: `
                INSERT INTO GroupAcquisitionDecision (groupId, gameId, status, decidedBy, note)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(groupId, gameId) DO UPDATE SET
                    status = excluded.status,
                    decidedBy = excluded.decidedBy,
                    decidedAt = CURRENT_TIMESTAMP,
                    note = excluded.note
            `,
            args: [groupId, gameId, status, decidedBy, note],
        })
    }

    reopenGroupAcquisitionDecision(groupId: number, gameId: number) {
        return this.database.execute({
            sql: `
                UPDATE GroupAcquisitionDecision
                SET status = 'open', decidedBy = NULL, decidedAt = NULL, note = NULL
                WHERE groupId = ? AND gameId = ? AND status = 'not_now'
            `,
            args: [groupId, gameId],
        })
    }

    removeGroupGameInterest(groupId: number, accountId: number, gameId: number) {
        return this.database.execute({
            sql: 'DELETE FROM GroupGameInterest WHERE groupId = ? AND accountId = ? AND gameId = ?',
            args: [groupId, accountId, gameId],
        })
    }

    async createGroupMembership(groupDto: CreateGroupMembershipBody) {
        await this.database.execute({
            sql: 'INSERT INTO GroupMembership (accountId, groupId) VALUES (?, ?)',
            args: [groupDto.accountId, groupDto.groupId],
        })
    }

    deleteGroupMembershipById(accountId: number, groupId: number) {
        return this.database.execute({
            sql: 'DELETE FROM GroupMembership WHERE accountId = ? AND groupId = ?',
            args: [accountId, groupId],
        })
    }

    deleteAllGroupMembershipByGroupId(groupId: number) {
        return this.database.execute({
            sql: 'DELETE FROM GroupMembership WHERE groupId = ?',
            args: [groupId],
        })
    }
}
