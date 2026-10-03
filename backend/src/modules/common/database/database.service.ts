import { Client, createClient, type InStatement, type TransactionMode } from '@libsql/client'
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { ProviderTimeoutError, fetchWithTimeout } from '../../../common/http/provider-timeout'

import { AccountQueries } from './queries/accounts.queries'
import { CollectionQueries } from './queries/collection.queries'
import { GameQueries } from './queries/games.queries'
import { GroupQueries } from './queries/groups.queries'
import { InvitationQueries } from './queries/invitations.queries'
import { NotificationQueries } from './queries/notifications.queries'
import { RecommendationQueries } from './queries/recommendations.queries'
import { SessionQueries } from './queries/sessions.queries'

export const CURRENT_SCHEMA_VERSION = '0017'

/** Statements that only read, so running them twice is harmless. */
const READ_ONLY_SQL = /^\s*(SELECT|WITH)\b/i
const WRITE_SQL = /\b(INSERT|UPDATE|DELETE|REPLACE)\b/i

function isReadOnly(sql: string): boolean {
    return READ_ONLY_SQL.test(sql) && !WRITE_SQL.test(sql)
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
    execute(stmt: InStatement) {
        const sql = typeof stmt === 'string' ? stmt : stmt.sql

        this.LOGGER.log(sql)

        return this.executeWithRetry(stmt, sql)
    }

    /**
     * Turso's first query after a quiet spell can stall for several seconds
     * (#64). A read that times out is sent once more, which then answers in
     * well under a second. Writes are never repeated.
     */
    private async executeWithRetry(stmt: InStatement, sql: string) {
        try {
            return await this.tursoClient.execute(stmt)
        } catch (error) {
            if (!(error instanceof ProviderTimeoutError) || !isReadOnly(sql)) throw error

            this.LOGGER.warn('Database read timed out; retrying once')
            return this.tursoClient.execute(stmt)
        }
    }

    transaction(mode: TransactionMode) {
        return this.tursoClient.transaction(mode)
    }
}
