import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'

import { DatabaseService } from '../../common/database/database.service.js'

import type {
    GroupAcquisitionDecisionStatus,
    GroupAcquisitionEntryDto,
    GroupGameInterestBody,
    UpdateGroupAcquisitionDecisionBody,
} from '../../../common/types/group-game-interest.type.js'
import type { AvatarDto, UserPublicDto } from '../../../common/types/user.type.js'

@Injectable()
export class GroupAcquisitionService {
    constructor(private readonly databaseService: DatabaseService) {}

    async getBoard(groupId: number): Promise<Array<GroupAcquisitionEntryDto>> {
        const resultSet = await this.databaseService.groups.getGroupAcquisitionBoard(groupId)
        const entries = new Map<number, GroupAcquisitionEntryDto>()

        for (const row of resultSet.rows) {
            const gameId = Number(row[0])
            const interestedBy: UserPublicDto = {
                id: Number(row[8]),
                username: String(row[9]),
                displayName: String(row[10]),
                avatar: JSON.parse(String(row[11])) as AvatarDto,
            }
            const existing = entries.get(gameId)

            if (existing) {
                existing.interestedBy.push(interestedBy)
                continue
            }

            const titleEn = String(row[5] ?? row[6] ?? '')
            const titleEs = String(row[6] ?? row[5] ?? '')

            entries.set(gameId, {
                gameData: {
                    id: gameId,
                    title: titleEn,
                    imageUrl: String(row[1]),
                    gameAvgDuration: Number(row[2] ?? 0),
                    minPlayers: Number(row[3] ?? 0),
                    maxPlayers: Number(row[4] ?? 0),
                    titleTranslations: { en: titleEn, es: titleEs },
                },
                interestedBy: [interestedBy],
                interestCount: Number(row[12] ?? 0),
                ownerCount: Number(row[13] ?? 0),
                firstInterestedAt: String(row[7]),
                decisionStatus: this.getDecisionStatus(row[14]),
                decisionAt: row[15] === null || row[15] === undefined ? null : String(row[15]),
                decisionBy:
                    row[16] === null || row[16] === undefined
                        ? null
                        : {
                              id: Number(row[16]),
                              username: String(row[17]),
                              displayName: String(row[18]),
                              avatar: JSON.parse(String(row[19])) as AvatarDto,
                          },
            })
        }

        return [...entries.values()]
    }

    async addInterest(groupId: number, accountId: number, body: GroupGameInterestBody): Promise<{ success: true }> {
        const game = await this.databaseService.games.getGameById(body.gameId)

        if (game.rows.length === 0) {
            throw new NotFoundException(`Game with id ${body.gameId} not found`)
        }

        const availableGameIds = await this.databaseService.groups.getGroupAvailableGameIds(groupId)

        if (availableGameIds.includes(body.gameId)) {
            throw new BadRequestException('This group already owns the selected game')
        }

        const result = await this.databaseService.groups.addGroupGameInterestAndReopenDecision(groupId, accountId, body.gameId)

        if (result.rowsAffected === 0) {
            const availableGameIdsAfterWrite = await this.databaseService.groups.getGroupAvailableGameIds(groupId)

            if (availableGameIdsAfterWrite.includes(body.gameId)) {
                throw new BadRequestException('This group already owns the selected game')
            }
        }

        return { success: true }
    }

    async updateDecision(
        groupId: number,
        accountId: number,
        gameId: number,
        body: UpdateGroupAcquisitionDecisionBody,
    ): Promise<{ success: true }> {
        const game = await this.databaseService.games.getGameById(gameId)

        if (game.rows.length === 0) {
            throw new NotFoundException(`Game with id ${gameId} not found`)
        }

        const availableGameIds = await this.databaseService.groups.getGroupAvailableGameIds(groupId)

        if (availableGameIds.includes(gameId)) {
            throw new BadRequestException('This group already owns the selected game')
        }

        await this.databaseService.groups.upsertGroupAcquisitionDecision(groupId, gameId, accountId, body.status, body.note ?? null)
        return { success: true }
    }

    private getDecisionStatus(value: unknown): GroupAcquisitionDecisionStatus {
        return value === 'planned' || value === 'not_now' ? value : 'open'
    }

    async removeInterest(groupId: number, accountId: number, gameId: number): Promise<{ success: true }> {
        await this.databaseService.groups.removeGroupGameInterest(groupId, accountId, gameId)
        return { success: true }
    }
}
