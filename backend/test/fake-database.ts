import { DatabaseService } from '../src/modules/common/database/database.service.js'
import { AccountDeletionQueries } from '../src/modules/common/database/queries/account-deletion.queries.js'
import { AccountQueries } from '../src/modules/common/database/queries/accounts.queries.js'
import { CollectionQueries } from '../src/modules/common/database/queries/collection.queries.js'
import { GameQueries } from '../src/modules/common/database/queries/games.queries.js'
import { GroupQueries } from '../src/modules/common/database/queries/groups.queries.js'
import { InvitationQueries } from '../src/modules/common/database/queries/invitations.queries.js'
import { NotificationQueries } from '../src/modules/common/database/queries/notifications.queries.js'
import { RecommendationQueries } from '../src/modules/common/database/queries/recommendations.queries.js'
import { SessionQueries } from '../src/modules/common/database/queries/sessions.queries.js'

const DOMAINS = {
    accounts: AccountQueries,
    accountDeletion: AccountDeletionQueries,
    collection: CollectionQueries,
    games: GameQueries,
    groups: GroupQueries,
    invitations: InvitationQueries,
    notifications: NotificationQueries,
    recommendations: RecommendationQueries,
    sessions: SessionQueries,
}

/**
 * Builds a DatabaseService stand-in from flat query mocks, filing each one
 * under its domain: `fakeDatabase({ getGroupById })` answers
 * `databaseService.groups.getGroupById`. Methods of DatabaseService itself,
 * such as `checkHealth`, stay at the top level.
 */
export function fakeDatabase(queries: object): DatabaseService {
    const fake: Record<string, unknown> = {}

    for (const [name, query] of Object.entries(queries)) {
        if (name in DatabaseService.prototype) {
            fake[name] = query
            continue
        }
        const domain = Object.entries(DOMAINS).find(([, queryClass]) => name in queryClass.prototype)?.[0]

        if (!domain) throw new Error(`fakeDatabase: no query named ${name}`)
        fake[domain] = { ...(fake[domain] as object), [name]: query }
    }

    return fake as unknown as DatabaseService
}
