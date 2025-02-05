import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { CreateUserBody, UpdateUserBody, UserCompleteDto, UserGetDto } from '../../common/types/user.type'
import { ResultSet } from '@libsql/client/.'
import { usersSchema } from '../../common/schemas'
import { GameDto } from '../../common/types/game.type'
import { InvitationWithExtraData } from '../../common/types/invitation.type'
import { GroupsService } from '../groups/groups.service'
import { NotificationDto } from '../../common/types/notification.type'
import { GroupMembershipsService } from '../group-memberships/group-memberships.service'
import { GameReviewAndGameData } from '../../common/types/game-review.type'
import { MeetsService } from '../meets/meets.service'
import { MeetDto } from '../../common/types/meet.type'

@Injectable()
export class UsersService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly groupsService: GroupsService,
        private readonly groupMembershipsService: GroupMembershipsService,
        private readonly meetsService: MeetsService,
    ) {}

    private _parseResultSet(resultSet: ResultSet): Array<UserCompleteDto> {
        const users = resultSet.rows.map(row => ({
            id: Number(row[0]),
            email: String(row[1]),
            username: String(row[2]),
            password: String(row[3]),
            imageUrl: String(row[4]),
            displayName: String(row[5]),
            createdAt: String(row[6]),
            isDeleted: Boolean(row[7]),
            isAdmin: Number(row[8]) === 1 ? true : false,
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

        return {
            ...users[0],
            password: include_password ? users[0].password : undefined!,
        }
    }

    async createUser(userDto: CreateUserBody) {
        this.LOGGER.log(`Creating user ${userDto.username} - ${userDto.email}`)
        try {
            await this.databaseService.createUser(userDto)

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

    async getUserGroups(userId: number) {
        this.LOGGER.log('Getting groups for user')
        const resultSet = await this.databaseService.getUserGroups(userId)

        return resultSet.rows.map(row => Number(row[0]))
    }

    async getUserGames(userId: number): Promise<Array<GameDto>> {
        this.LOGGER.log(`Getting all games for user ${userId}`)
        const resultSet = await this.databaseService.getUserGames(userId)

        return resultSet.rows.map(row => ({
            id: Number(row[0]),
            title: String(row[1]),
            imageUrl: String(row[2]),
            gameAvgDuration: Number(row[3]),
            minPlayers: Number(row[4]),
            maxPlayers: Number(row[5]),
        }))
    }

    async getUserReviews(userId: number): Promise<Array<GameReviewAndGameData>> {
        this.LOGGER.log(`Getting reviews for user ${userId}`)
        const resultSet = await this.databaseService.getUserReviews(userId)

        return resultSet.rows.map(row => ({
            accountId: Number(row[0]),
            gameId: Number(row[1]),
            review: Number(row[2]),
            reviewDate: String(row[3]),
            gameData: JSON.parse(String(row[4])) as GameDto,
        }))
    }

    async getUserNotifications(userId: number): Promise<Array<NotificationDto>> {
        this.LOGGER.log(`Getting all notifications for user ${userId}`)
        const userData = await this.getUserById(userId)
        const resultSet = await this.databaseService.getUserNotifications(userData.id)

        return resultSet.rows.map(row => ({
            id: Number(row[0]),
            accountId: Number(row[1]),
            type: String(row[2]),
            message: String(row[3]),
            createdAt: String(row[4]),
            isRead: Boolean(row[5]),
        }))
    }

    async getUserMeets(userId: number): Promise<Array<MeetDto>> {
        this.LOGGER.log(`Getting all meets for user ${userId}`)
        // Step 1: Get all groups for user
        const getUserGroups = await this.databaseService.getUserGroups(userId)
        const groupIds = getUserGroups.rows.map(row => Number(row[0]))

        // Step 2: Get meets for each group
        const resultMeets: Array<MeetDto> = []

        for (const groupId of groupIds) {
            const resultSet = await this.databaseService.getGroupMeets(groupId)

            const meets = resultSet.rows.map(row => ({
                id: Number(row[0]),
                groupId: Number(row[1]),
                createdBy: Number(row[2]),
                meetDate: String(row[3]),
                isConfirmed: Boolean(row[4]),
            }))

            resultMeets.push(...meets)
        }
        return resultMeets.sort((a, b) => {
            return new Date(b.meetDate).getTime() - new Date(a.meetDate).getTime()
        })
    }

    async getUserInvitationsReceived(userId: number): Promise<Array<InvitationWithExtraData>> {
        this.LOGGER.log('Getting invitations for user')
        const resultSet1 = await this.databaseService.getUserInvitationsReceived(userId)
        const invitations: Array<InvitationWithExtraData> = resultSet1.rows.map(row => ({
            id: Number(row[0]),
            groupId: Number(row[1]),
            fromAccountId: Number(row[2]),
            toAccountId: Number(row[3]),
            sentAt: String(row[4]),
            fromAccount: undefined!,
            group: undefined!,
        }))

        for (const invitation of invitations) {
            invitation.group = await this.groupsService.getGroupWithMembersAndGames(invitation.groupId)
            invitation.fromAccount = await this.getUserById(invitation.fromAccountId)
        }

        return invitations
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

    async leaveGroup(userId: number, groupId: number): Promise<{ success: boolean }> {
        this.LOGGER.log(`User with id ${userId} leaving group with id ${groupId}`)

        // Step 1: Get user data
        const userData = await this.getUserById(userId)

        // Step 2: Get group data
        const groupData = await this.groupsService.getGroupWithMembersAndGames(groupId)

        // Step 3: Check if user is owner
        if (groupData.createdBy === userData.id) {
            throw new BadRequestException('Owner cannot leave group')
        }

        // Step 4: Leave group
        await this.databaseService.deleteGroupMembershipById(userId, groupId)

        return { success: true }
    }

    async createMeeting(userId: number, groupId: number): Promise<{ success: boolean; meetId: number }> {
        this.LOGGER.log(`User with id ${userId} creating meeting for group with id ${groupId}`)

        // Step 1: Get user data
        const userData = await this.getUserById(userId)

        // Step 2: Get group data
        const groupData = await this.groupsService.getGroupWithMembersAndGames(groupId)

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

    async createGroup(userId: number, groupName: string): Promise<{ success: boolean }> {
        this.LOGGER.log(`${userId} is creating group ${groupName}`)
        // Step 1: Get user data(to be the owner)
        const userData = await this.getUserById(userId)

        // Step 2: Create group
        await this.groupsService.createGroup({
            name: groupName,
            createdBy: userData.id,
        })

        // Step 3:Get groupId by GroupName
        const groupData = await this.groupsService.getGroupByName(groupName)

        // Step 4: Put the owner in the group
        await this.groupMembershipsService.createGroupMembership({
            accountId: userData.id,
            groupId: groupData.id,
        })

        return { success: true }
    }

    async deleteGroup(userId: number, groupId: number): Promise<{ success: boolean }> {
        this.LOGGER.log(`User with id ${userId} deleting group with id ${groupId}`)

        // Step 1: Validate user and group exists.
        await this.getUserById(userId)
        await this.groupsService.getGroupWithMembersAndGames(groupId)

        // Step 2: Clear related tables
        await this.databaseService.deleteAllGroupMembershipByGroupId(groupId)
        await this.databaseService.deleteAllInvitationsByGroupId(groupId)

        // Step 3: Delete Group
        await this.groupsService.deleteGroupById(groupId)

        return { success: true }
    }
}
