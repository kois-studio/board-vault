import { Injectable } from '@nestjs/common'

import { toIsoDate } from '../../../common/utils/stored-date.js'
import { DatabaseService } from '../../common/database/database.service.js'

import type { GameCompleteDto } from '../../../common/types/game.type.js'
import type { GroupInsightsDto } from '../../../common/types/group-insights.type.js'
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
}
