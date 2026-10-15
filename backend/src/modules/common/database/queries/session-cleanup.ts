import type { InStatement, InValue } from '@libsql/client'

/**
 * The account can still act on the night, as `requireSessionRole` decides: its organizer, the group
 * owner, or invited and not declined, by account or through its group person.
 */
const accountComing = (meet: string, account: string) => `(
    ${account} = (SELECT createdBy FROM Meet WHERE id = ${meet})
    OR ${account} = (SELECT g.createdBy FROM UserGroup g INNER JOIN Meet m ON m.groupId = g.id WHERE m.id = ${meet})
    OR EXISTS (
        SELECT 1 FROM MeetAttendee ma
        WHERE ma.meetId = ${meet} AND ma.accountId = ${account} AND ma.rsvpStatus != 'declined'
    )
    OR (
        -- Like requireSessionRole's COALESCE: the account's own invitation answers first.
        NOT EXISTS (SELECT 1 FROM MeetAttendee ma WHERE ma.meetId = ${meet} AND ma.accountId = ${account})
        AND EXISTS (
            SELECT 1 FROM MeetPersonAttendee mpa
            INNER JOIN GroupPerson gp ON gp.id = mpa.groupPersonId
            WHERE mpa.meetId = ${meet} AND gp.accountId = ${account} AND mpa.rsvpStatus != 'declined'
        )
    )
)`

/** The group person is invited and has not declined, the rule for naming them as bringer (`getMeetComingPersonIds`). */
const personComing = (meet: string, person: string) => `EXISTS (
    SELECT 1 FROM MeetPersonAttendee mpa
    WHERE mpa.meetId = ${meet} AND mpa.groupPersonId = ${person} AND mpa.rsvpStatus != 'declined'
)`

/**
 * Votes and "I'll bring it" belong to people coming to the night (#114, #115): the organizer, the
 * group owner, and whoever is invited and has not declined. These statements drop them for everyone else, on the
 * nights `meetIds` selects (a subquery, with `args` for its placeholders). Run them after anything
 * that changes who is coming: declining, editing the invited, or leaving the group (ADR-0018).
 * Safe to repeat; nights already played are not touched by callers that pass only upcoming ones.
 */
export function forgetWhoIsNotComing(meetIds: string, args: Array<InValue>): Array<InStatement> {
    return [
        {
            sql: `DELETE FROM MeetGameVote WHERE meetId IN (${meetIds}) AND NOT ${accountComing('MeetGameVote.meetId', 'MeetGameVote.accountId')}`,
            args,
        },
        {
            sql: `
                UPDATE MeetGame SET broughtByAccountId = NULL
                WHERE meetId IN (${meetIds}) AND broughtByAccountId IS NOT NULL
                  AND NOT ${accountComing('MeetGame.meetId', 'MeetGame.broughtByAccountId')}
            `,
            args,
        },
        {
            sql: `
                UPDATE MeetGame SET broughtByPersonId = NULL
                WHERE meetId IN (${meetIds}) AND broughtByPersonId IS NOT NULL
                  AND NOT ${personComing('MeetGame.meetId', 'MeetGame.broughtByPersonId')}
            `,
            args,
        },
    ]
}
