import type { UserType } from '../../api/api.types'
import type { HistoryEntryView } from '../../components/history-entry/history-entry.component'
import type { RecommendationGroupSignal } from '../../components/recommendation-card/recommendation-card.component'
import type { SessionStat } from '../../components/session-summary/session-summary.component'
import type { SessionDateParts } from '../../core/utils/sessionTiming'

/**
 * Friday Crew: the example group the landing page fills the real components with.
 * The games are made up and the covers are ours (public/images/landing), so no publisher art appears.
 */

export type ExamplePerson = { key: string; name: string; avatar: UserType['avatar'] }
export type ExampleGame = { id: string; title: string; imageUrl: string; minutes: number; minPlayers: number; maxPlayers: number }

function person(key: string, name: string, backgroundColor: string): ExamplePerson {
    return {
        key,
        name,
        avatar: { type: 'initials', initials: name.slice(0, 2).toUpperCase(), backgroundColor, iconName: null, emoji: null },
    }
}

export const EXAMPLE_GROUP = 'Friday Crew'

export const EXAMPLE_PEOPLE: Array<ExamplePerson> = [
    person('ana', 'Ana', '#8A2C7A'),
    person('leo', 'Leo', '#0E7490'),
    person('sam', 'Sam', '#B45309'),
    person('mia', 'Mia', '#047857'),
    person('jon', 'Jon', '#1D4ED8'),
]

const [ana, leo, sam, mia, jon] = EXAMPLE_PEOPLE as [ExamplePerson, ExamplePerson, ExamplePerson, ExamplePerson, ExamplePerson]

function game(id: string, title: string, minutes: number, minPlayers: number, maxPlayers: number): ExampleGame {
    return { id, title, imageUrl: `/images/landing/${id}.svg`, minutes, minPlayers, maxPlayers }
}

export const EXAMPLE_GAMES = {
    lanternHarbor: game('lantern-harbor', 'Lantern Harbor', 60, 2, 5),
    meepleMarket: game('meeple-market', 'Meeple Market', 45, 2, 5),
    tidalTiles: game('tidal-tiles', 'Tidal Tiles', 30, 2, 4),
    skyOrchards: game('sky-orchards', 'Sky Orchards', 75, 1, 4),
    nightTrain: game('night-train', 'Night Train', 90, 3, 6),
    quietForest: game('quiet-forest', 'Quiet Forest', 20, 1, 5),
    diceKitchen: game('dice-kitchen', 'Dice Kitchen', 25, 2, 6),
    cometRun: game('comet-run', 'Comet Run', 40, 2, 5),
}

const games = EXAMPLE_GAMES

/** Bring your shelf: games with the people who own them. */
export const EXAMPLE_SHELF: Array<ExampleGame & { owners: Array<ExamplePerson> }> = [
    { ...games.lanternHarbor, owners: [ana, mia] },
    { ...games.nightTrain, owners: [leo] },
    { ...games.diceKitchen, owners: [sam, jon] },
    { ...games.quietForest, owners: [mia] },
]

export type ExampleRecommendation = {
    game: ExampleGame
    score: number
    historyLabel: string
    reasons: Array<string>
    signal: RecommendationGroupSignal | null
}

/** Decide: what fits the five coming tonight, for two hours. */
export const EXAMPLE_RECOMMENDATIONS: Array<ExampleRecommendation> = [
    {
        game: games.lanternHarbor,
        score: 92,
        historyLabel: 'Last played 6 weeks ago',
        reasons: ['Fits all 5 coming', 'Ana and Mia rated it 9', 'Fits in your 2 hours'],
        signal: { interestedCount: 3, interestedNames: 'Leo, Sam, Jon', notForUsCount: 0 },
    },
    {
        game: games.meepleMarket,
        score: 84,
        historyLabel: 'New to this group',
        reasons: ['Fits all 5 coming', 'Jon has wanted to try it', '45 minutes, room for a second game'],
        signal: null,
    },
    {
        game: games.diceKitchen,
        score: 77,
        historyLabel: 'Last played 2 weeks ago',
        reasons: ['Fits all 5 coming', 'Quick to teach'],
        signal: null,
    },
]

/** Plan: next Friday's game night. */
export const EXAMPLE_SESSION: {
    date: SessionDateParts
    accessibleDate: string
    timezone: string
    relativeLabel: string
    notes: string
    stats: Array<SessionStat>
    rsvps: Array<{ person: ExamplePerson; answer: 'going' | 'not-going' | 'no-answer' }>
} = {
    date: { month: 'Oct', day: '16', weekday: 'Fri', time: '19:30', year: '2026' },
    accessibleDate: '16 October 2026 at 19:30',
    timezone: 'Europe/Madrid',
    relativeLabel: 'in 4 days',
    notes: 'At Mia’s. Sam brings snacks.',
    stats: [
        { label: 'Invited', value: 5 },
        { label: 'Going', value: 3 },
        { label: 'Shortlisted', value: 3 },
        { label: 'Played', value: 0 },
    ],
    rsvps: [
        { person: ana, answer: 'going' },
        { person: mia, answer: 'going' },
        { person: sam, answer: 'going' },
        { person: leo, answer: 'no-answer' },
        { person: jon, answer: 'not-going' },
    ],
}

/** Decide together: the shortlist the group is voting on. */
export const EXAMPLE_SHORTLIST: Array<ExampleGame> = [games.lanternHarbor, games.meepleMarket, games.skyOrchards]

/** Remember: last Friday's night in the history. */
export const EXAMPLE_HISTORY: HistoryEntryView = {
    id: 'example',
    title: EXAMPLE_GROUP,
    dateLabel: '9 October 2026 at 19:30',
    weekday: 'Fri',
    day: '9',
    link: null,
    attendees: [ana, leo, sam, mia].map(({ key, name, avatar }) => ({ key, name, avatar })),
    attendeeSummary: 'With Ana, Leo, Sam and Mia',
    notes: 'Leo finally won Night Train.',
    games: [
        {
            key: 'night-train',
            title: games.nightTrain.title,
            initials: 'NT',
            imageUrl: games.nightTrain.imageUrl,
            link: null,
            winners: 'Leo won',
            playedBy: 'Ana, Leo, Sam and Mia',
            everyonePlayed: true,
        },
        {
            key: 'tidal-tiles',
            title: games.tidalTiles.title,
            initials: 'TT',
            imageUrl: games.tidalTiles.imageUrl,
            link: null,
            winners: 'Mia won',
            playedBy: 'Ana and Mia',
            everyonePlayed: false,
        },
        {
            key: 'comet-run',
            title: games.cometRun.title,
            initials: 'CR',
            imageUrl: games.cometRun.imageUrl,
            link: null,
            winners: 'Ana and Sam won',
            playedBy: 'Ana, Leo, Sam and Mia',
            everyonePlayed: true,
        },
    ],
}
