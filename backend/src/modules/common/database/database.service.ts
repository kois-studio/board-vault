import { Client, createClient, type InStatement, type TransactionMode } from '@libsql/client'
import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { AccountQueries } from './queries/accounts.queries'
import { CollectionQueries } from './queries/collection.queries'
import { GameQueries } from './queries/games.queries'
import { GroupQueries } from './queries/groups.queries'
import { InvitationQueries } from './queries/invitations.queries'
import { NotificationQueries } from './queries/notifications.queries'
import { RecommendationQueries } from './queries/recommendations.queries'
import { SessionQueries } from './queries/sessions.queries'

export const CURRENT_SCHEMA_VERSION = '0015'

/**
 * The database connection. Queries live in per-domain classes under
 * `queries/`, reached through the properties below (for example
 * `databaseService.groups.getGroupById(id)`).
 */
@Injectable()
export class DatabaseService implements OnModuleInit {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)
    private tursoClient: Client

    readonly accounts = new AccountQueries(this)
    readonly collection = new CollectionQueries(this)
    readonly games = new GameQueries(this)
    readonly groups = new GroupQueries(this)
    readonly invitations = new InvitationQueries(this)
    readonly notifications = new NotificationQueries(this)
    readonly recommendations = new RecommendationQueries(this)
    readonly sessions = new SessionQueries(this)

    constructor(private readonly configService: ConfigService) {}

    onModuleInit() {
        const url = String(this.configService.get<string>('TURSO_DATABASE_URL'))
        const authToken = this.configService.get<string>('TURSO_AUTH_TOKEN')?.trim()

        this.tursoClient = createClient({
            url,
            ...(!url.startsWith('file:') && authToken ? { authToken } : {}),
        })
    }

    async checkHealth(): Promise<void> {
        await this.execute('SELECT 1')
    }

    async hasCurrentSchema(): Promise<boolean> {
        const result = await this.execute('SELECT MAX(version) AS version FROM SchemaMigrations')

        return String(result.rows[0]?.version ?? '') === CURRENT_SCHEMA_VERSION
    }

    /**
     * Use this instead of the client's `execute` to log the parameterized SQL template before executing it.
     * Bound values are intentionally excluded because they may contain secrets or personal data.
     */
    execute(stmt: InStatement) {
        const sql = typeof stmt === 'string' ? stmt : stmt.sql

        this.LOGGER.log(sql)

        return this.tursoClient.execute(stmt)
    }

    transaction(mode: TransactionMode) {
        return this.tursoClient.transaction(mode)
    }
}
