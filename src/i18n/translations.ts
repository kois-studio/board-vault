export const supported_locales = ['en', 'es', /**, 'fr', 'de', 'it", 'pt-br'*/] as const

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
    // Login page
    login_title: string
    login_description: string
    login_description_link: string
    login_email: string
    login_password: string
    login_button: string
    // Register page
    register_title: string
    register_description: string
    register_description_link: string
    register_alias: string
    register_email: string
    register_password: string
    register_password_confirm: string
    register_button: string
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
    login_title: {
        en: 'Login',
        es: 'Iniciar sesión',
    },
    login_description: {
        en: 'New here?',
        es: '¿Eres nuevo aquí?',
    },
    login_description_link: {
        en: 'Create an account',
        es: 'Crea una cuenta',
    },
    login_email: {
        en: 'Email',
        es: 'Correo electrónico',
    },
    login_password: {
        en: 'Password',
        es: 'Contraseña',
    },
    login_button: {
        en: 'Access',
        es: 'Acceder',
    },
    register_title: {
        en: 'Create an account',
        es: 'Crea una cuenta',
    },
    register_description: {
        en: 'Already have an account?',
        es: '¿Ya tienes una cuenta?',
    },
    register_description_link: {
        en: 'Login',
        es: 'Iniciar sesión',
    },
    register_alias: {
        en: 'Alias (username)',
        es: 'Alias (nombre de usuario)',
    },
    register_email: {
        en: 'Email',
        es: 'Correo electrónico',
    },
    register_password: {
        en: 'Password',
        es: 'Contraseña',
    },
    register_password_confirm: {
        en: 'Confirm password',
        es: 'Confirmar contraseña',
    },
    register_button: {
        en: 'Register',
        es: 'Registrarse',
    },
}

// Util line to extract the translations by language
function _generateTranslations(lang: TranslationLangs) {
    return Object.fromEntries(Object.entries(raw_translations).map(([key, value]) => [key, value[lang]])) as Record<keyof TranslationKeys, string>
}

export const translations: Record<TranslationLangs, Record<keyof TranslationKeys, string>> = {
    en: _generateTranslations('en'),
    es: _generateTranslations('es'),
    // de: _generateTranslations('de'),
    // fr: _generateTranslations('fr'),
}
