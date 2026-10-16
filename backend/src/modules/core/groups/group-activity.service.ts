import { Injectable } from '@nestjs/common'

import { DatabaseService } from '../../common/database/database.service.js'

import type {
    GroupActivityAccountDto,
    GroupActivityData,
    GroupActivityDto,
    GroupActivityGameDto,
    GroupActivityPageDto,
    GroupActivityPersonDto,
    GroupActivityType,
} from '../../../common/types/group-activity.type.js'
import type { GroupPersonStanding } from '../../../common/types/group-person.type.js'

const DEFAULT_PAGE_SIZE = 30

/** Keys of `data` that hold ids of accounts, group people or games, so their names can be sent along. */
const ACCOUNT_KEYS = ['addedAccountIds', 'removedAccountIds', 'attendedAccountIds', 'winnerAccountIds', 'accountId']
const PERSON_KEYS = ['addedPersonIds', 'removedPersonIds', 'attendedPersonIds', 'winnerPersonIds', 'groupPersonId']
const GAME_KEYS = ['addedGameIds', 'removedGameIds', 'changedGameIds']

function idsIn(data: GroupActivityData, keys: Array<string>): Array<number> {
    return keys.flatMap(key => {
        const value = data[key]

        if (Array.isArray(value)) return value
        return typeof value === 'number' ? [value] : []
    })
}

function parseData(value: unknown): GroupActivityData {
    try {
        const parsed: unknown = JSON.parse(String(value ?? '{}'))

        return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as GroupActivityData) : {}
    } catch {
        return {}
    }
}

/**
 * Reads a group's history (ADR-0020), newest first. Entries hold only ids; names, standings and
 * game titles are looked up now, for the whole page at once, so a deleted account shows as
 * "Deleted account" and a renamed person under their new name.
 */
@Injectable()
export class GroupActivityService {
    constructor(private readonly databaseService: DatabaseService) {}

    async getPage(groupId: number, before?: number, limit = DEFAULT_PAGE_SIZE): Promise<GroupActivityPageDto> {
        const history = this.databaseService.groupActivity
        const rows = (await history.getPage(groupId, before ?? null, limit)).rows
        const entries = rows.slice(0, limit).map(row => ({
            id: Number(row[0]),
            type: String(row[1]) as GroupActivityType,
            createdAt: String(row[2]),
            actorAccountId: Number(row[3]),
            meetId: row[4] === null ? null : Number(row[4]),
            groupPersonId: row[5] === null ? null : Number(row[5]),
            gameId: row[6] === null ? null : Number(row[6]),
            subjectAccountId: row[7] === null ? null : Number(row[7]),
            data: parseData(row[8]),
        }))

        const accountIds = [
            ...new Set(
                entries.flatMap(entry => [
                    entry.actorAccountId,
                    ...(entry.subjectAccountId === null ? [] : [entry.subjectAccountId]),
                    ...idsIn(entry.data, ACCOUNT_KEYS),
                ]),
            ),
        ]
        const personIds = [
            ...new Set(
                entries.flatMap(entry => [
                    ...(entry.groupPersonId === null ? [] : [entry.groupPersonId]),
                    ...idsIn(entry.data, PERSON_KEYS),
                ]),
            ),
        ]
        const gameIds = [
            ...new Set(entries.flatMap(entry => [...(entry.gameId === null ? [] : [entry.gameId]), ...idsIn(entry.data, GAME_KEYS)])),
        ]

        const [accountRows, personRows, gameRows] = await Promise.all([
            accountIds.length > 0 ? history.getAccounts(groupId, accountIds) : { rows: [] },
            personIds.length > 0 ? history.getPeople(groupId, personIds) : { rows: [] },
            gameIds.length > 0 ? history.getGameTitles(gameIds) : { rows: [] },
        ])
        const accounts = new Map<number, GroupActivityAccountDto>(
            accountRows.rows.map(row => [
                Number(row[0]),
                { id: Number(row[0]), name: String(row[1]), standing: String(row[2]) as GroupPersonStanding },
            ]),
        )
        // A person not found in this group is never named: ids from elsewhere resolve to nothing.
        const people = new Map<number, GroupActivityPersonDto>(
            personRows.rows.map(row => [
                Number(row[0]),
                { id: Number(row[0]), name: String(row[1]), standing: String(row[2]) as GroupPersonStanding },
            ]),
        )
        const games = new Map<number, GroupActivityGameDto>(
            gameRows.rows.map(row => [Number(row[0]), { id: Number(row[0]), title: row[1] === null ? null : String(row[1]) }]),
        )
        const account = (id: number): GroupActivityAccountDto => accounts.get(id) ?? { id, name: 'Deleted account', standing: 'deleted' }
        const game = (id: number): GroupActivityGameDto => games.get(id) ?? { id, title: null }

        return {
            entries: entries.map((entry): GroupActivityDto => ({
                id: entry.id,
                type: entry.type,
                createdAt: entry.createdAt,
                actor: account(entry.actorAccountId),
                meetId: entry.meetId,
                person: entry.groupPersonId === null ? null : (people.get(entry.groupPersonId) ?? null),
                game: entry.gameId === null ? null : game(entry.gameId),
                subject: entry.subjectAccountId === null ? null : account(entry.subjectAccountId),
                data: entry.data,
                accounts: [...new Set(idsIn(entry.data, ACCOUNT_KEYS))].map(account),
                people: [...new Set(idsIn(entry.data, PERSON_KEYS))].flatMap(id => people.get(id) ?? []),
                games: [...new Set(idsIn(entry.data, GAME_KEYS))].map(game),
            })),
            hasMore: rows.length > limit,
        }
    }
}
