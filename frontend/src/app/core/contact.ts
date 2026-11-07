/**
 * How people reach whoever runs Board Vault. Every contact link and the privacy page read these, so a new inbox
 * or a registered company is a change here only.
 */

/** The studio inbox (Proton), read by a person. */
export const CONTACT_EMAIL = 'contact@kois.app'

/** Who is responsible for personal data in Board Vault (the GDPR controller), named on the privacy page. */
export const DATA_CONTROLLER = 'David M. Fajardo Oubiña'

/** A `mailto:` link to the inbox, with the subject already filled in. */
export function contactMailto(subject: string): string {
    return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`
}
