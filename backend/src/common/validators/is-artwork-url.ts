import { registerDecorator, type ValidationOptions } from 'class-validator'

/**
 * ## Artwork URL
 * Empty, meaning no artwork, or an absolute http(s) address with a host: the rule the artwork
 * fields in the app already apply (`https?://…`). Leading and trailing spaces are ignored, as
 * the services trim the value before saving it.
 */
export function isArtworkUrl(value: unknown): boolean {
    if (typeof value !== 'string') return false

    const trimmed = value.trim()

    if (trimmed === '') return true

    try {
        const url = new URL(trimmed)

        return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== ''
    } catch {
        return false
    }
}

/** Validates a property with `isArtworkUrl`. */
export function IsArtworkUrl(validationOptions?: ValidationOptions): PropertyDecorator {
    return (target, propertyName) => {
        registerDecorator({
            name: 'isArtworkUrl',
            target: target.constructor,
            propertyName: String(propertyName),
            options: { message: '$property must be empty or an http(s) address', ...validationOptions },
            validator: { validate: isArtworkUrl },
        })
    }
}
