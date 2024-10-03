import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Client, createClient } from '@libsql/client'
import { CreateUserBody, UpdateUserBody } from '../../common/types/shared/user.type'
import * as bcrypt from 'bcrypt'
import { CreateGroupBody, UpdateGroupBody } from 'src/common/types/shared/group.type'
import { CreateGroupMembershipBody } from 'src/common/types/shared/group-membership.type'

@Injectable()
export class DatabaseService implements OnModuleInit {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)
    private tursoClient: Client

    constructor(private readonly configService: ConfigService) {}

    onModuleInit() {
        this.tursoClient = createClient({
            url: String(this.configService.get<string>('TURSO_DATABASE_URL')),
            authToken: String(this.configService.get<string>('TURSO_AUTH_TOKEN')),
        })
    }

    // #region User

    getUsers() {
        this.LOGGER.log('Getting all users')
        return this.tursoClient.execute('SELECT * FROM Account')
    }

    getUserById(id: number) {
        this.LOGGER.log(`Getting user with id ${id}`)
        return this.tursoClient.execute({
            sql: 'SELECT * FROM Account WHERE id = ?',
            args: [id],
        })
    }

    getUserByEmail(email: string) {
        this.LOGGER.log(`Getting user with email ${email}`)
        return this.tursoClient.execute({
            sql: 'SELECT * FROM Account WHERE email = ?',
            args: [email],
        })
    }

    async createUser(userDto: CreateUserBody) {
        this.LOGGER.log(`Creating user ${userDto.username} - ${userDto.email}`)
        const { email, password, username, display_name, imageUrl } = userDto
        const hashedPassword = await bcrypt.hash(password, 10)

        // Execute the query
        await this.tursoClient.execute({
            sql: 'INSERT INTO Account (email, password, username, display_name, imageUrl) VALUES (?, ?, ?, ?, ?)',
            args: [email, hashedPassword, username, display_name, imageUrl],
        })
    }

    async updateUser(id: number, partialUserDto: UpdateUserBody) {
        this.LOGGER.log(`Updating user with id ${id}`)

        // Array to store fields to update
        const fields = []
        const args = []

        // Dynamically build the update query based on the provided properties
        if (partialUserDto.email) {
            fields.push('email = ?')
            args.push(partialUserDto.email)
        }
        if (partialUserDto.password) {
            fields.push('password = ?')
            const hashedPassword = await bcrypt.hash(partialUserDto.password, 10)

            args.push(hashedPassword)
        }
        if (partialUserDto.username) {
            fields.push('username = ?')
            args.push(partialUserDto.username)
        }
        if (partialUserDto.display_name) {
            fields.push('display_name = ?')
            args.push(partialUserDto.display_name)
        }
        if (partialUserDto.imageUrl) {
            fields.push('imageUrl = ?')
            args.push(partialUserDto.imageUrl)
        }

        // Error if no fields are provided
        if (fields.length === 0) {
            throw new BadRequestException('No fields to update')
        }

        // Add user id as the last argument
        args.push(id)

        // Construct the final query
        const sql = `
          UPDATE Account
          SET ${fields.join(', ')}
          WHERE id = ?
        `

        this.LOGGER.log(`Executing query: ${sql}`)

        // Execute the query
        await this.tursoClient.execute({ sql, args })

        // Return the updated user
        return this.getUserById(id)
    }

    softDeleteUserById(id: number) {
        this.LOGGER.log(`Soft deleting user with id ${id}`)
        return this.tursoClient.execute({
            sql: 'UPDATE Account SET is_deleted = true WHERE id = ?',
            args: [id],
        })
    }

    // avoid deleting users -> soft delete instead
    deleteUserById(id: number) {
        this.LOGGER.log(`Deleting user with id ${id}`)
        return this.tursoClient.execute({
            sql: 'DELETE FROM Account WHERE id = ?',
            args: [id],
        })
    }

    // #region Group

    getGroups() {
        this.LOGGER.log('Getting all groups')
        return this.tursoClient.execute('SELECT * FROM UserGroup')
    }

    getGroupById(id: number) {
        this.LOGGER.log(`Getting group with id ${id}`)
        return this.tursoClient.execute({
            sql: 'SELECT * FROM UserGroup WHERE id = ?',
            args: [id],
        })
    }

    async createGroup(groupDto: CreateGroupBody) {
        this.LOGGER.log(`Creating group ${groupDto.name} - by ${groupDto.createdBy}`)

        // Execute the query
        await this.tursoClient.execute({
            sql: 'INSERT INTO UserGroup (name, createdBy) VALUES (?, ?)',
            args: [groupDto.name, groupDto.createdBy],
        })
    }

    async updateGroup(id: number, partialGroupDto: UpdateGroupBody) {
        this.LOGGER.log(`Updating user with id ${id}`)

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

        this.LOGGER.log(`Executing query: ${sql}`)

        // Execute the query
        await this.tursoClient.execute({ sql, args })

        // Return the updated user
        return this.getGroupById(id)
    }

    softDeleteGroupById(id: number) {
        this.LOGGER.log(`Soft deleting user with id ${id}`)
        return this.tursoClient.execute({
            sql: 'UPDATE UserGroup SET is_deleted = true WHERE id = ?',
            args: [id],
        })
    }

    // avoid deleting groups -> soft delete instead
    deleteGroupById(id: number) {
        this.LOGGER.log(`Deleting user with id ${id}`)
        return this.tursoClient.execute({
            sql: 'DELETE FROM UserGroup WHERE id = ?',
            args: [id],
        })
    }

    // #region Group Membership

    getGroupMemberships() {
        this.LOGGER.log('Getting all memberships')
        return this.tursoClient.execute('SELECT * FROM GroupMembership')
    }

    getGroupMembershipById(accountId: number, groupId: number) {
        this.LOGGER.log(`Getting membership with id ${accountId} ${groupId}`)
        return this.tursoClient.execute({
            sql: 'SELECT * FROM GroupMembership WHERE accountId = ? AND groupId = ?',
            args: [accountId, groupId],
        })
    }

    async createGroupMembership(groupDto: CreateGroupMembershipBody) {
        this.LOGGER.log(`Creating membership ${groupDto.accountId} - by ${groupDto.groupId}`)

        // Execute the query
        await this.tursoClient.execute({
            sql: 'INSERT INTO GroupMembership (accountId, groupId) VALUES (?, ?)',
            args: [groupDto.accountId, groupDto.groupId],
        })
    }

    deleteGroupMembershipById(accountId: number, groupId: number) {
        this.LOGGER.log(`Deleting user with id ${accountId} ${groupId}`)
        return this.tursoClient.execute({
            sql: 'DELETE FROM GroupMembership WHERE accountId = ? AND groupId = ?',
            args: [accountId, groupId],
        })
    }

    // #region Game
}
