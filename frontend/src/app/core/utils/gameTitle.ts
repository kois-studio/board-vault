type TitledGame = { title?: string | null; titleTranslations?: { en?: string | null } | null }

/** A game's English title, its stored title, or "Untitled game" when the catalogue has neither. */
export function gameTitle(game: TitledGame): string {
    return game.titleTranslations?.en || game.title || 'Untitled game'
}
