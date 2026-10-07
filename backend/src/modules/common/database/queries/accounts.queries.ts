import { BadRequestException } from '@nestjs/common'

import { ACCOUNT_COLUMNS } from '../database.constants.js'

import type { UpdateUserBody } from '../../../../common/types/user.type.js'
import type { DatabaseService } from '../database.service.js'

/** Accounts (the `Account` table). */
export class AccountQueries {
    constructor(private readonly database: DatabaseService) {}

    getUsers() {
        return this.database.execute(`SELECT ${ACCOUNT_COLUMNS} FROM Account`)
    }

    getUserById(id: number) {
        return this.database.execute({
            sql: `SELECT ${ACCOUNT_COLUMNS} FROM Account WHERE id = ?`,
            args: [id],
        })
    }

    getUsersByIds(ids: Array<number>) {
        return this.database.execute({
            sql: `SELECT ${ACCOUNT_COLUMNS} FROM Account WHERE id IN (${ids.map(() => '?').join(', ')})`,
            args: ids,
        })
    }

    getUserByEmail(email: string) {
        return this.database.execute({
            sql: `SELECT ${ACCOUNT_COLUMNS} FROM Account WHERE email = ?`,
            args: [email],
        })
    }

    /** Case-insensitive: Clerk stores usernames in lower case, and people type them either way. */
    getUserByUsername(username: string) {
        return this.database.execute({
            sql: `SELECT ${ACCOUNT_COLUMNS} FROM Account WHERE lower(username) = lower(?)`,
            args: [username],
        })
    }

    getUserByClerkId(clerkUserId: string) {
        return this.database.execute({
            sql: `SELECT ${ACCOUNT_COLUMNS} FROM Account WHERE clerkUserId = ?`,
            args: [clerkUserId],
        })
    }

    createClerkUser(user: { email: string; username: string; displayName: string; avatar: string; clerkUserId: string }) {
        return this.database.execute({
            sql: 'INSERT INTO Account (email, username, displayName, avatar, clerkUserId) VALUES (?, ?, ?, ?, ?)',
            args: [user.email, user.username, user.displayName, user.avatar, user.clerkUserId],
        })
    }

    async updateUserProfile(id: number, partialUserDto: UpdateUserBody) {
        const fields = []
        const args = []

        if (partialUserDto.displayName) {
            fields.push('displayName = ?')
            args.push(partialUserDto.displayName)
        }
        if (partialUserDto.avatar) {
            fields.push('avatar = ?')
            args.push(JSON.stringify(partialUserDto.avatar))
        }

        if (fields.length === 0) {
            throw new BadRequestException('No fields to update')
        }

        args.push(id)
        await this.database.execute({ sql: `UPDATE Account SET ${fields.join(', ')} WHERE id = ?`, args })

        return this.getUserById(id)
    }

    updateUsername(id: number, username: string) {
        return this.database.execute({
            sql: 'UPDATE Account SET username = ? WHERE id = ?',
            args: [username, id],
        })
    }

    updateUserEmail(id: number, email: string) {
        return this.database.execute({
            sql: 'UPDATE Account SET email = ? WHERE id = ?',
            args: [email, id],
        })
    }
}
