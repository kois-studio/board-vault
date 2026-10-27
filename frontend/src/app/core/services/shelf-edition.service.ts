import { Injectable, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import type { GameEditionType } from '../../api/api.types'
import { preselectedEdition } from '../utils/editionChoice'

/** What the chooser asks: which of these editions is the copy. */
export type EditionQuestion = {
    /** The game's title as the page shows it. */
    gameTitle: string
    editions: ReadonlyArray<GameEditionType>
    /** The edition to start on; null for "Not sure". */
    selectedId: number | null
    /** Adding a game to My Games, or changing the edition of one already there. */
    mode: 'add' | 'change'
    answer: (answer: { editionId: number | null } | null) => void
}

/**
 * The one way a game goes onto the shelf (ADR-0025): a game with several editions asks which one the person
 * owns, preselecting the edition in the page's language, else the primary one; a game with one edition does not
 * ask. The question is shown by `<app-edition-choice-dialog>` in the app shell.
 */
@Injectable({ providedIn: 'root' })
export class ShelfEditionService {
    private readonly api = inject(Api)

    /** The question being asked, if any. */
    public readonly question = signal<EditionQuestion | null>(null)

    /**
     * Adds the game to My Games, asking which edition first when it has several. Resolves false when the person
     * cancels (nothing was added); rejects when the editions or the add fail. A page that already has the game's
     * editions passes them instead of asking the API again.
     */
    public async addToShelf(
        userId: number,
        game: { id: number },
        gameTitle: string,
        knownEditions?: ReadonlyArray<GameEditionType>,
    ): Promise<boolean> {
        const editions = knownEditions ?? (await firstValueFrom(this.api.getGameEditions(game.id)))
        let editionId: number | null = null

        if (editions.length > 1) {
            const answer = await this.ask({
                gameTitle,
                editions,
                selectedId: preselectedEdition(editions)?.id ?? null,
                mode: 'add',
            })

            if (!answer) return false
            editionId = answer.editionId
        }

        await firstValueFrom(this.api.addGameToUserCollection(userId, game.id, editionId))
        return true
    }

    /**
     * Asks which edition a copy on the shelf is and saves the answer. Resolves the new `editionId` (null for "not
     * said"), or undefined when the person cancels; rejects when saving fails.
     */
    public async changeEdition(
        userId: number,
        game: { id: number },
        gameTitle: string,
        editions: ReadonlyArray<GameEditionType>,
        currentEditionId: number | null,
    ): Promise<number | null | undefined> {
        const answer = await this.ask({
            gameTitle,
            editions,
            selectedId: currentEditionId ?? preselectedEdition(editions)?.id ?? null,
            mode: 'change',
        })

        if (!answer) return undefined
        await firstValueFrom(this.api.setOwnedEdition(userId, game.id, answer.editionId))
        return answer.editionId
    }

    private ask(question: Omit<EditionQuestion, 'answer'>): Promise<{ editionId: number | null } | null> {
        return new Promise((resolve) => {
            this.question.set({
                ...question,
                answer: (answer) => {
                    this.question.set(null)
                    resolve(answer)
                },
            })
        })
    }
}
