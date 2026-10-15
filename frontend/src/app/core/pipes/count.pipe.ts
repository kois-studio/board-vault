import { Pipe, PipeTransform } from '@angular/core'
import { countOf, playerRange } from '../utils/plural'

/** `{{ n | count: 'game' }}` → "1 game", "3 games". */
@Pipe({ name: 'count' })
export class CountPipe implements PipeTransform {
    transform(count: number, singular: string, plural?: string): string {
        return countOf(count, singular, plural)
    }
}

/** `{{ game | players }}` → "2–4 players", "2 players", "1 player"; `players: 'short'` → "2–4", "2". */
@Pipe({ name: 'players' })
export class PlayersPipe implements PipeTransform {
    transform(game: { minPlayers: number; maxPlayers: number }, format: 'long' | 'short' = 'long'): string {
        return playerRange(game.minPlayers, game.maxPlayers, format === 'short')
    }
}
