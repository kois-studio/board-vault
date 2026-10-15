import { Pipe, PipeTransform } from '@angular/core'
import { gameTitle } from '../utils/gameTitle'

/** `{{ game | gameTitle }}`: the English title, the stored title, or "Untitled game". */
@Pipe({ name: 'gameTitle' })
export class GameTitlePipe implements PipeTransform {
    transform(game: Parameters<typeof gameTitle>[0]): string {
        return gameTitle(game)
    }
}
