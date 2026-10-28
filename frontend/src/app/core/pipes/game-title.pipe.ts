import { Pipe, PipeTransform } from '@angular/core'
import { gameCoverAlt, gameTitle } from '../utils/gameTitle'

/** `{{ game | gameTitle }}`: the title in the page's language, else English, else the stored one (gameTitle). */
@Pipe({ name: 'gameTitle' })
export class GameTitlePipe implements PipeTransform {
    transform(game: Parameters<typeof gameTitle>[0]): string {
        return gameTitle(game)
    }
}

/** `[alt]="title | coverAlt"`: a cover's description for screen readers, from a title already shown (gameCoverAlt). */
@Pipe({ name: 'coverAlt' })
export class CoverAltPipe implements PipeTransform {
    transform(title: string): string {
        return gameCoverAlt(title)
    }
}
