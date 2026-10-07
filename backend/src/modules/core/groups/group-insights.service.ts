import { Injectable } from '@nestjs/common'

import { toIsoDate } from '../../../common/utils/stored-date.js'
import { DatabaseService } from '../../common/database/database.service.js'

import type { GameCompleteDto } from '../../../common/types/game.type.js'
import type { GroupCollectionDto, GroupCollectionPersonDto, GroupInsightsDto } from '../../../common/types/group-insights.type.js'
import type { AvatarDto } from '../../../common/types/user.type.js'
import type { Row } from '@libsql/client'

/** Columns 0–6 of an insights game row: id, image, duration, players, and the en/es titles. */
function toGame(row: Row): GameCompleteDto {
    const titleEn = String(row[5] ?? row[6] ?? '')
    const titleEs = String(row[6] ?? row[5] ?? '')

    return {
        id: Number(row[0]),
        title: titleEn,
        imageUrl: String(row[1] ?? ''),
        gameAvgDuration: Number(row[2] ?? 0),
        minPlayers: Number(row[3] ?? 0),
        maxPlayers: Number(row[4] ?? 0),
        titleTranslations: { en: titleEn, es: titleEs },
    }
}

function toAvatar(value: unknown): AvatarDto | null {
    if (value === null || value === undefined) return null
    try {
        return JSON.parse(String(value)) as AvatarDto
    } catch {
        return null
    }
}

const toNullableId = (value: unknown): number | null => (value === null || value === undefined ? null : Number(value))

@Injectable()
export class GroupInsightsService {
    constructor(private readonly databaseService: DatabaseService) {}

    async getInsights(groupId: number): Promise<GroupInsightsDto> {
        const { totals, standings, mostPlayed, neverPlayed } = await this.databaseService.groups.getGroupInsights(groupId)
        const total = totals.rows[0]

        return {
            sessions: Number(total?.[0] ?? 0),
            gamesPlayed: Number(total?.[1] ?? 0),
            gamesWithWinner: Number(total?.[2] ?? 0),
            standings: standings.rows.map(row => ({
                accountId: toNullableId(row[0]),
                groupPersonId: toNullableId(row[1]),
                displayName: String(row[2] ?? ''),
                avatar: toAvatar(row[3]),
                sessions: Number(row[4] ?? 0),
                gamesPlayed: Number(row[5] ?? 0),
                wins: Number(row[6] ?? 0),
            })),
            mostPlayed: mostPlayed.rows.map(row => ({
                gameData: toGame(row),
                sessions: Number(row[7] ?? 0),
                lastPlayedAt: toIsoDate(String(row[8] ?? '')),
            })),
            neverPlayed: neverPlayed.rows.map(row => toGame(row)),
            neverPlayedCount: Number(neverPlayed.rows[0]?.[7] ?? 0),
        }
    }

    /** Everyone's games in the group and their approximate worth, from catalogue retail prices only. */
    async getCollection(groupId: number): Promise<GroupCollectionDto> {
        const rows = (await this.databaseService.groups.getGroupCollection(groupId)).rows
        const people = new Map<string, GroupCollectionPersonDto & { cents: number }>()
        let totalCents = 0
        let copies = 0
        let pricedCopies = 0

        for (const row of rows) {
            const accountId = toNullableId(row[0])
            const groupPersonId = toNullableId(row[1])
            const key = accountId === null ? `person:${groupPersonId}` : `account:${accountId}`
            const person = people.get(key) ?? {
                accountId,
                groupPersonId,
                displayName: String(row[2] ?? ''),
                avatar: toAvatar(row[3]),
                games: [],
                worth: 0,
                pricedGames: 0,
                cents: 0,
            }

            people.set(key, person)
            if (row[4] === null || row[4] === undefined) continue

            // Columns 4–10 are the game, in the order toGame reads.
            person.games.push(toGame(Array.from({ length: 7 }, (_, index) => row[4 + index]) as unknown as Row))
            copies++

            const cents = row[11] === null || row[11] === undefined ? null : Number(row[11])

            if (cents === null) continue
            person.cents += cents
            person.pricedGames++
            totalCents += cents
            pricedCopies++
        }

        return {
            worth: Math.round(totalCents / 100),
            copies,
            pricedCopies,
            people: [...people.values()].map(({ cents, ...person }) => ({ ...person, worth: Math.round(cents / 100) })),
        }
    }
}
