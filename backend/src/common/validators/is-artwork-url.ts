import { registerDecorator, type ValidationOptions } from 'class-validator'

import { ARTWORK_PATH } from '../artwork/artwork.js'

/**
 * ## Artwork URL
 * Empty, meaning no artwork, an absolute http(s) address with a host (the rule the artwork fields
 * in the app apply), or a stored `/artwork/…` path, which an admin form sends back to keep it.
 * Leading and trailing spaces are ignored, as the services trim the value.
 */
export function isArtworkUrl(value: unknown): boolean {
    if (typeof value !== 'string') return false

    const trimmed = value.trim()

    if (trimmed === '' || ARTWORK_PATH.test(trimmed)) return true

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
