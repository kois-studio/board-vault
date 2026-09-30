import { DatabaseService } from '../src/modules/common/database/database.service'
import { AccountQueries } from '../src/modules/common/database/queries/accounts.queries'
import { CollectionQueries } from '../src/modules/common/database/queries/collection.queries'
import { GameQueries } from '../src/modules/common/database/queries/games.queries'
import { GroupQueries } from '../src/modules/common/database/queries/groups.queries'
import { InvitationQueries } from '../src/modules/common/database/queries/invitations.queries'
import { NotificationQueries } from '../src/modules/common/database/queries/notifications.queries'
import { RecommendationQueries } from '../src/modules/common/database/queries/recommendations.queries'
import { SessionQueries } from '../src/modules/common/database/queries/sessions.queries'

const DOMAINS = {
    accounts: AccountQueries,
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
