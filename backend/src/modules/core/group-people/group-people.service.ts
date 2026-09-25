import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'

import { DatabaseService } from '../../common/database/database.service'

import type {
    CreateGroupPersonBody,
    GroupPersonDto,
    GroupPersonGameOwnershipDto,
    GroupPersonGamePreferenceDto,
    GroupPersonWorkspaceDto,
    UpdateGroupPersonBody,
    UpdateGroupPersonOwnershipBody,
    UpdateGroupPersonPreferenceBody,
} from '../../../common/types/group-person.type'
import type { AvatarDto } from '../../../common/types/user.type'
import type { ResultSet } from '@libsql/client/.'

@Injectable()
export class GroupPeopleService {
    constructor(private readonly databaseService: DatabaseService) {}

    async getWorkspace(actorAccountId: number, groupId: number, includeArchived = false): Promise<Array<GroupPersonWorkspaceDto>> {
        await this.assertGroupMember(actorAccountId, groupId)
        const people = this.databaseService.getGroupPeople(groupId, includeArchived)
        const rows = await people

        return Promise.all(
            rows.rows.map(async row => {
                const person = this.mapPersonRow(row)
                const [ownership, preferences] = await Promise.all([
                    this.getOwnershipRows(person.id, groupId),
                    this.getPreferenceRows(person.id, groupId),
                ])

                return { person, ownership, preferences }
            }),
        )
    }

    async create(actorAccountId: number, groupId: number, body: CreateGroupPersonBody): Promise<GroupPersonDto> {
        await this.assertGroupOwner(actorAccountId, groupId)
        const result = await this.databaseService.createGroupPerson(groupId, actorAccountId, body)

        return this.getPersonOrThrow(Number(result.lastInsertRowid), groupId)
    }

    async update(actorAccountId: number, groupId: number, personId: number, body: UpdateGroupPersonBody): Promise<GroupPersonDto> {
        await this.assertGroupOwner(actorAccountId, groupId)
        await this.getPersonOrThrow(personId, groupId)
        const result = await this.databaseService.updateGroupPerson(personId, groupId, body)

        if (result.rowsAffected !== 1) {
            throw new NotFoundException('Group person not found')
        }

        return this.getPersonOrThrow(personId, groupId)
    }

    async getOwnership(actorAccountId: number, groupId: number, personId: number): Promise<Array<GroupPersonGameOwnershipDto>> {
        await this.assertGroupMember(actorAccountId, groupId)
        await this.getPersonOrThrow(personId, groupId)
        return this.getOwnershipRows(personId, groupId)
    }

    async updateOwnership(
        actorAccountId: number,
        groupId: number,
        personId: number,
        body: UpdateGroupPersonOwnershipBody,
    ): Promise<{ success: true }> {
        await this.assertGroupOwner(actorAccountId, groupId)
        await this.getPersonOrThrow(personId, groupId)
        await this.assertGameExists(body.gameId)
        await this.databaseService.upsertGroupPersonOwnership(personId, body.gameId, actorAccountId, body.status)
        return { success: true }
    }

    async getPreferences(actorAccountId: number, groupId: number, personId: number): Promise<Array<GroupPersonGamePreferenceDto>> {
        await this.assertGroupMember(actorAccountId, groupId)
        await this.getPersonOrThrow(personId, groupId)
        return this.getPreferenceRows(personId, groupId)
    }

    async updatePreference(
        actorAccountId: number,
        groupId: number,
        personId: number,
        body: UpdateGroupPersonPreferenceBody,
    ): Promise<{ success: true }> {
        await this.assertGroupOwner(actorAccountId, groupId)
        await this.getPersonOrThrow(personId, groupId)
        await this.assertGameExists(body.gameId)
        await this.databaseService.upsertGroupPersonPreference(personId, body.gameId, actorAccountId, body.preference)
        return { success: true }
    }

    async deletePreference(actorAccountId: number, groupId: number, personId: number, gameId: number): Promise<{ success: true }> {
        await this.assertGroupOwner(actorAccountId, groupId)
        await this.getPersonOrThrow(personId, groupId)
        const result = await this.databaseService.deleteGroupPersonPreference(personId, groupId, gameId)

        if (result.rowsAffected !== 1) {
            throw new NotFoundException('Group person preference not found')
        }

        return { success: true }
    }

    private async assertGroupMember(accountId: number, groupId: number): Promise<void> {
        const membership = await this.databaseService.getGroupMembershipById(accountId, groupId)

        if (membership.rows.length === 0) {
            throw new ForbiddenException('You must belong to the group to view group people')
        }
    }

    private async assertGroupOwner(accountId: number, groupId: number): Promise<void> {
        const group = await this.databaseService.getGroupById(groupId)

        if (group.rows.length === 0) {
            throw new NotFoundException('Group not found')
        }
        if (Number(group.rows[0][2]) !== accountId) {
            throw new ForbiddenException('Only the group owner can manage group people')
        }
    }

    private async assertGameExists(gameId: number): Promise<void> {
        const game = await this.databaseService.getGameById(gameId)

        if (game.rows.length === 0) {
            throw new NotFoundException('Game not found')
        }
    }

    private async getPersonOrThrow(personId: number, groupId: number): Promise<GroupPersonDto> {
        const result = await this.databaseService.getGroupPersonById(personId, groupId)

        if (result.rows.length === 0) {
            throw new NotFoundException('Group person not found')
        }
        return this.mapPersonRow(result.rows[0])
    }

    private async getOwnershipRows(personId: number, groupId: number): Promise<Array<GroupPersonGameOwnershipDto>> {
        const result = await this.databaseService.getGroupPersonOwnership(personId, groupId)

        return result.rows.map(row => ({
            gameId: Number(row[0]),
            status: String(row[1]) as GroupPersonGameOwnershipDto['status'],
            source: String(row[2]) as GroupPersonGameOwnershipDto['source'],
            enteredByAccountId: Number(row[3]),
            confirmedByAccountId: row[4] === null ? null : Number(row[4]),
            createdAt: String(row[5]),
            updatedAt: String(row[6]),
        }))
    }

    private async getPreferenceRows(personId: number, groupId: number): Promise<Array<GroupPersonGamePreferenceDto>> {
        const result = await this.databaseService.getGroupPersonPreferences(personId, groupId)

        return result.rows.map(row => ({
            gameId: Number(row[0]),
            preference: String(row[1]) as GroupPersonGamePreferenceDto['preference'],
            source: String(row[2]) as GroupPersonGamePreferenceDto['source'],
            enteredByAccountId: Number(row[3]),
            createdAt: String(row[4]),
            updatedAt: String(row[5]),
        }))
    }

    private mapPersonRow(row: ResultSet['rows'][number]): GroupPersonDto {
        return {
            id: Number(row[0]),
            groupId: Number(row[1]),
            accountId: row[2] === null ? null : Number(row[2]),
            kind: String(row[3]) as GroupPersonDto['kind'],
            status: String(row[4]) as GroupPersonDto['status'],
            displayName: String(row[5]),
            avatar: this.parseAvatar(row[6]),
            createdAt: String(row[7]),
            updatedAt: String(row[8]),
            claimedAt: row[9] === null ? null : String(row[9]),
        }
    }

    private parseAvatar(value: unknown): AvatarDto | null {
        if (value === null || value === undefined || value === '') return null
        if (typeof value === 'object') return value as AvatarDto

        try {
            return JSON.parse(String(value)) as AvatarDto
        } catch {
            return null
        }
    }
}
