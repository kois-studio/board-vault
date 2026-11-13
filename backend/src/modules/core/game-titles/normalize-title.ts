/**
 * The form titles are stored and searched in: lower case, no accents or punctuation, words joined by hyphens.
 * "Love Letter" and "love-letter" both become `love-letter`.
 */
export function normalizeTitle(title: string): string {
    return title
        .toLowerCase()
        .normalize('NFD') // decompose accented characters
        .replace(/[̀-ͯ]/g, '') // remove accent marks
        .replace(/[^\w\s-]/g, '') // remove all non-alphanumeric except spaces and hyphens
        .trim() // remove leading/trailing spaces
        .replace(/\s+/g, '-') // replace spaces with hyphens for better readability
}
