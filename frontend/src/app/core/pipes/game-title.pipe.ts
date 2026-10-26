import { Pipe, PipeTransform } from '@angular/core'
import { gameTitle } from '../utils/gameTitle'

/** `{{ game | gameTitle }}`: the title in the page's language, else English, else the stored one (gameTitle). */
@Pipe({ name: 'gameTitle' })
export class GameTitlePipe implements PipeTransform {
    transform(game: Parameters<typeof gameTitle>[0]): string {
        return gameTitle(game)
    }
}
