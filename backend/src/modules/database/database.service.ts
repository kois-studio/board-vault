import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Client, createClient } from '@libsql/client'
import { CreateUserBody, UpdateUserBody } from '../../common/types/shared/user.type'
import * as bcrypt from 'bcrypt'

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
        this.LOGGER.log(`Creating user ${userDto.alias} - ${userDto.email}`)
        const { email, password, alias, imageUrl } = userDto
        const hashedPassword = await bcrypt.hash(password, 10)

        // Execute the query
        await this.tursoClient.execute({
            sql: 'INSERT INTO Account (email, password, alias, imageUrl) VALUES (?, ?, ?, ?)',
            args: [email, hashedPassword, alias, imageUrl],
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
            args.push(partialUserDto.password)
        }
        if (partialUserDto.alias) {
            fields.push('alias = ?')
            args.push(partialUserDto.alias)
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

    deleteUserById(id: number) {
        this.LOGGER.log(`Deleting user with id ${id}`)
        return this.tursoClient.execute({
            sql: 'DELETE FROM Account WHERE id = ?',
            args: [id],
        })
    }

    /**
     * /database/delete/:key
     */
    // @Wrapper(false)
    // async deleteOne(key: string): Promise<boolean> {
    //     this.LOGGER.log(`REDIS: Deleting single key ${key}`)
    //     // await this.REDIS.del(key)
    //     return true
    // }
}
