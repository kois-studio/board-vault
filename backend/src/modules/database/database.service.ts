import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Client, createClient } from '@libsql/client'

let is_redis_disabled = false

/**
 * This decorator wraps all the methods providing:
 * - A default response in case of redis being disabled in .env
 * - Error catching wrapping the method
 *
 * @param response_on_error If not provided, it will return null
 */
function Wrapper(response_on_error: any = null) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value
        const LOGGER = new Logger(target.constructor.name)

        descriptor.value = async function (...args: any[]) {
            // Before running any method, check if redis is disabled
            if (is_redis_disabled) {
                LOGGER.warn('REDIS: Redis is disabled')
                return response_on_error
            }

            // Wraps the method, catching any error
            try {
                return originalMethod.apply(this, args)
            } catch (err) {
                LOGGER.error('Error with Redis!', err)
                return response_on_error
            }
        }
    }
}

@Injectable()
export class DatabaseService implements OnModuleInit {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)
    private readonly REDIS_DISABLED: boolean = false
    private tursoClient: Client

    constructor(private readonly configService: ConfigService) {
        this.REDIS_DISABLED = configService.get<string>('UPSTASH_REDIS_REST_DISABLE') === 'true'
        is_redis_disabled = this.REDIS_DISABLED
    }

    onModuleInit() {
        this.tursoClient = createClient({
            url: String(this.configService.get<string>('TURSO_DATABASE_URL')),
            authToken: String(this.configService.get<string>('TURSO_AUTH_TOKEN')),
        })
    }

    getUsers() {
        this.LOGGER.log('Getting all users...')
        return this.tursoClient.execute('SELECT * FROM Account')
    }

    getUserById(id: number) {
        this.LOGGER.log(`Getting user with id ${id}...`)
        return this.tursoClient.execute({
            sql: 'SELECT * FROM Account WHERE id = ?',
            args: [id],
        })
    }

    getUserByEmail(email: string) {
        this.LOGGER.log(`Getting user with email ${email}...`)
        return this.tursoClient.execute({
            sql: 'SELECT * FROM Account WHERE email = ?',
            args: [email],
        })
    }

    createUser(email: string, password: string, alias: string, imageUrl: string) {
        this.LOGGER.log(`Creating user with ${email}`)
        return this.tursoClient.execute({
            sql: 'INSERT INTO Account (email, password, alias, imageUrl) VALUES (?, ?, ?, ?)',
            args: [email, password, alias, imageUrl],
        })
    }

    //by email, by id or by what?
    deleteUserById(id: number) {
        this.LOGGER.log(`Deleting user with id ${id}`)
        return this.tursoClient.execute({
            sql: 'DELETE FROM Account WHERE id = ?',
            args: [id],
        })
    }

    updateUser(id: number, email: string, password: string, alias: string, imageUrl: string) {
        this.LOGGER.log(`Update user based on id ${id}`)
        return this.tursoClient.execute({
            sql: 'UPDATE Account SET email = ?, password = ?, alias = ?, imageUrl = ? WHERE id = ?',
            args: [email, password, alias, imageUrl, id],
        })
    }

    /**
     * /database/delete/:key
     */
    // @Wrapper(false)
    // async deleteOne(key: string): Promise<boolean> {
    //     this.LOGGER.log(`REDIS: Deleting single key ${key}...`)
    //     // await this.REDIS.del(key)
    //     return true
    // }
}
