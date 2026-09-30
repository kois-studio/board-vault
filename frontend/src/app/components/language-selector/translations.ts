export const supported_locales = ['en', 'es' /**, 'fr', 'de', 'it", 'pt-br'*/] as const

export const language_titles: Record<TranslationLangs, string> = {
    en: 'English',
    es: 'Español',
    // fr: 'Français',
    // de: 'Deutsch',
    // it: "Italiano",
    // 'pt-br': "Português'
}

type TranslationLangs = (typeof supported_locales)[number]
type TranslationKeys = {
    test: string
    games_title: string
}

const raw_translations: Record<keyof TranslationKeys, Record<TranslationLangs, string>> = {
    test: {
        en: 'Test',
        es: 'Prueba',
    },
    games_title: {
        en: 'Games list',
        es: 'Lista de juegos',
    },
}

// Util line to extract the translations by language
function _generateTranslations(lang: TranslationLangs) {
    return Object.fromEntries(Object.entries(raw_translations).map(([key, value]) => [key, value[lang]])) as Record<
        keyof TranslationKeys,
        string
    >
}

export const translations: Record<TranslationLangs, Record<keyof TranslationKeys, string>> = {
    en: _generateTranslations('en'),
    es: _generateTranslations('es'),
    // de: _generateTranslations('de'),
    // fr: _generateTranslations('fr'),
}
