import type { UserType } from '../../api/api.types'
import type { RecommendationGroupSignal } from '../../components/recommendation-card/recommendation-card.component'

/**
 * Friday Crew: the example group the landing page samples are filled with.
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

/** The fan of covers under the hero, and the shelf the "find" sample filters. */
export const EXAMPLE_SHELF: Array<ExampleGame> = Object.values(games)

/** Add: the catalogue search for "lantern", one of them already on the shelf. */
export const EXAMPLE_SEARCH: Array<ExampleGame & { owned: boolean }> = [
    { ...games.lanternHarbor, owned: false },
    { ...games.nightTrain, owned: true },
    { ...games.quietForest, owned: false },
]

/** Rate: ratings out of 10, shown as five stars like the rest of the app. */
export const EXAMPLE_RATINGS: Array<{ game: ExampleGame; rating: number; plays: number }> = [
    { game: games.lanternHarbor, rating: 10, plays: 7 },
    { game: games.diceKitchen, rating: 8, plays: 12 },
    { game: games.tidalTiles, rating: 6, plays: 3 },
]

export const EXAMPLE_WISH = games.skyOrchards

/** Share: the group's games with the people who own them. */
export const EXAMPLE_GROUP_SHELF: Array<ExampleGame & { owners: Array<ExamplePerson> }> = [
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

/** What fits the five coming tonight, for two hours. */
export const EXAMPLE_RECOMMENDATION: ExampleRecommendation = {
    game: games.lanternHarbor,
    score: 92,
    historyLabel: 'Last played 6 weeks ago',
    reasons: ['Fits all 5 coming', 'Ana and Mia rated it 9', 'Fits in your 2 hours'],
    signal: { interestedCount: 3, interestedNames: 'Leo, Sam, Jon', notForUsCount: 0 },
}

/** Plan: next Friday's game night, and what the crew played last Friday. */
export const EXAMPLE_NIGHT: {
    weekday: string
    day: string
    title: string
    meta: string
    rsvps: Array<{ person: ExamplePerson; answer: 'going' | 'not-going' | 'no-answer' }>
    lastNight: Array<{ game: ExampleGame; winner: string }>
} = {
    weekday: 'Fri',
    day: '16',
    title: 'Game night at Mia’s',
    meta: '19:30 · in 4 days',
    rsvps: [
        { person: ana, answer: 'going' },
        { person: mia, answer: 'going' },
        { person: sam, answer: 'going' },
        { person: leo, answer: 'no-answer' },
        { person: jon, answer: 'not-going' },
    ],
    lastNight: [
        { game: games.nightTrain, winner: 'Leo' },
        { game: games.tidalTiles, winner: 'Mia' },
        { game: games.cometRun, winner: 'Ana' },
    ],
}
