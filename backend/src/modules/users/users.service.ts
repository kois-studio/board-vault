import { ResultSet } from '@libsql/client/.'
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'

import { usersSchema } from '../../common/schemas'
import { MeetDto } from '../../common/types/meet.type'
import { AvatarDto, CreateUserBody, UpdateUserBody, UserCompleteDto, UserGetDto } from '../../common/types/user.type'
import { DatabaseService } from '../common/database/database.service'
import { GroupsService } from '../core/groups/groups.service'
import { MeetsService } from '../meets/meets.service'

@Injectable()
export class UsersService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly groupsService: GroupsService,
        private readonly meetsService: MeetsService,
    ) {}

    private _parseResultSet(resultSet: ResultSet): Array<UserCompleteDto> {
        const users = resultSet.rows.map(row => ({
            id: Number(row[0]),
            email: String(row[1]),
            username: String(row[2]),
            password: String(row[3]),
            avatar: JSON.parse(String(row[4])) as AvatarDto,
            displayName: String(row[5]),
            createdAt: String(row[6]),
            isDeleted: Boolean(row[7]),
            isAdmin: Number(row[8]) === 1 ? true : false,
            email_verified: Boolean(row[9]),
            verification_token: String(row[10]),
            password_reset_token: String(row[11]),
        }))

        const result = usersSchema.safeParse(users)

        if (!result.success) {
            this.LOGGER.error('Failed to parse users from database')
            this.LOGGER.error(result.error)
            return []
        }

        return result.data
    }

    async getUsers(): Promise<Array<UserGetDto>> {
        this.LOGGER.log('Getting all users')
        const resultSet = await this.databaseService.getUsers()
        const users = this._parseResultSet(resultSet)

        return users.map(user => ({
            ...user,
            password: undefined,
        }))
    }

    async getUserById(id: number): Promise<UserGetDto> {
        this.LOGGER.log(`Getting user with id ${id}`)
        const resultSet = await this.databaseService.getUserById(id)
        const users = this._parseResultSet(resultSet)

        if (users.length === 0) {
            throw new NotFoundException(`User with id ${id} not found`)
        }
        users[0].password = undefined!
        users[0].verification_token = undefined!
        users[0].password_reset_token = undefined!

        return users[0]
    }

    /**
     * password is needed for auth.service,
     * thats why `include_password` option available
     */
    async getUserByEmail(email: string, include_password = false): Promise<UserGetDto | UserCompleteDto> {
        this.LOGGER.log(`Getting user with email ${email}`)
        const resultSet = await this.databaseService.getUserByEmail(email)
        const users = this._parseResultSet(resultSet)

        if (users.length === 0) {
            throw new NotFoundException(`User with email ${email} not found`)
        }

        users[0].verification_token = undefined!
        users[0].password_reset_token = undefined!

        return {
            ...users[0],
            password: include_password ? users[0].password : undefined!,
        }
    }

    async createUser(userDto: CreateUserBody, verificationToken: string) {
        this.LOGGER.log(`Creating user ${userDto.username} - ${userDto.email}`)
        try {
            await this.databaseService.createUser(userDto, verificationToken)

            return { success: true }
        } catch (error) {
            this.LOGGER.error('Failed to create user', error)
            throw new ConflictException('Email or Username already in use')
        }
    }

    async updateUser(id: number, partialUserDto: UpdateUserBody): Promise<{ success: boolean }> {
        this.LOGGER.log(`Updating user with id ${id}`)
        const resultSet = await this.databaseService.updateUser(id, partialUserDto)

        if (resultSet.rows.length === 0) {
            throw new NotFoundException(`User with id ${id} not found`)
        }

        return { success: true }
    }

    async deleteUserById(id: number): Promise<{ success: boolean }> {
        this.LOGGER.log(`Deleting user with id ${id}`)
        const resultSet = await this.databaseService.softDeleteUserById(id)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException(`User with id ${id} not found`)
        }

        return { success: true }
    }

    async updateGames(accountId: number, gamesToAdd: number[], gamesToRemove: number[]): Promise<{ success: boolean }> {
        this.LOGGER.log(`Updating games for user with id ${accountId}`)
        try {
            await this.databaseService.updateGames(accountId, gamesToAdd, gamesToRemove)

            return { success: true }
        } catch (error) {
            this.LOGGER.error('Failed to update games for user', error)
            throw new NotFoundException('Failed to update games for user')
        }
    }

    async createMeeting(userId: number, groupId: number): Promise<{ success: boolean; meetId: number }> {
        this.LOGGER.log(`User with id ${userId} creating meeting for group with id ${groupId}`)

        // Step 1: Get user data
        const userData = await this.getUserById(userId)

        // Step 2: Get group data
        const groupData = await this.groupsService.getGroupById(groupId)

        // Step 3: Create meeting
        const createResultSet = await this.databaseService.createMeeting(groupData.id, userData.id)

        // TODO: CRUD operations for meeting + db-meeting.ts + meeting.ts types
        const meetingData = await this.meetsService.getMeetById(Number(createResultSet.lastInsertRowid))

        // Step 4: Add all members from the group to MeetAttendee table
        await this.databaseService.addGroupMembersToMeeting(meetingData.id, groupId)

        // Step 5: Add all games from the group to MeetGame table
        // await this.databaseService.addGroupGamesToMeeting(meetingData.id, groupId)

        // Step 6: Notify all members of the group
        // TODO:
        // await this.databaseService.notifyGroupMembers(groupId, 'Meeting created')
        return { success: true, meetId: meetingData.id }
    }
}
