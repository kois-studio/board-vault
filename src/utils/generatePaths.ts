import { translations } from '../i18n/translations'

// Must be exported from inside every /[lang]/*/*.astro file
// It indicates Astro which static paths to generate for that file
export function generatePaths() {
    return Object.keys(translations).map(lang => ({ params: { lang: lang as keyof typeof translations } }))
}
