import { environment } from '../../../environments/environment'

/**
 * Game artwork Board Vault keeps itself comes from the API as a path, `/artwork/<gameId>-<hash>.webp`
 * (ADR-0015). It is served by the API, so the path is resolved against the API's address. Any other
 * value, an address not yet copied or empty for none, is used as it is.
 */
export function resolveArtworkUrl(imageUrl: string, apiUrl = environment.apiUrl): string {
    return imageUrl.startsWith('/artwork/') ? `${apiUrl.replace(/\/$/, '')}${imageUrl}` : imageUrl
}
