type TableFields = 'meetId' | 'accountId' | 'gameId'

export type MeetAccountGameQueryOptions = {
    select?: TableFields[]
    where?: Partial<Record<TableFields, number>>
    distinct?: boolean
}
