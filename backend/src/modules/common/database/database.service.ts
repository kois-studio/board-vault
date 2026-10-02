import { Client, createClient, type InStatement, type TransactionMode } from '@libsql/client'
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { fetchWithTimeout, ProviderTimeoutError } from '../../../common/http/provider-timeout'
import { structuredLog } from '../../../common/logging/structured-log'

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
 * True for a statement that only reads, so running it twice is harmless.
 * Conservative: any write keyword, even inside a `WITH`, makes it a write.
 */
export function isReadOnlySql(sql: string): boolean {
    return /^\s*(SELECT|WITH)\b/i.test(sql) && !/\b(INSERT|UPDATE|DELETE|REPLACE|CREATE|DROP|ALTER)\b/i.test(sql)
}

/**
 * The database connection. Queries live in per-domain classes under
 * `queries/`, reached through the properties below (for example
 * `databaseService.groups.getGroupById(id)`).
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
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
            // Remote Turso runs over HTTP; every call is bounded (see PROVIDER_TIMEOUT_MS).
            fetch: fetchWithTimeout('database'),
        })
    }

    onModuleDestroy() {
        this.tursoClient?.close()
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
    async execute(stmt: InStatement) {
        const sql = typeof stmt === 'string' ? stmt : stmt.sql

        this.LOGGER.log(sql)

        try {
            return await this.tursoClient.execute(stmt)
        } catch (error) {
            // Turso can take seconds to answer the first query after a short idle spell, and the
            // next one is fast. A read that timed out is retried once; a write is not, because the
            // timed-out attempt may still have been applied.
            if (!(error instanceof ProviderTimeoutError) || !isReadOnlySql(sql)) throw error

            this.LOGGER.warn(structuredLog('database.retry', { reason: 'timeout' }))
            return this.tursoClient.execute(stmt)
        }
    }

    transaction(mode: TransactionMode) {
        return this.tursoClient.transaction(mode)
    }
}
