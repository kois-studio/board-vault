import type { Clerk } from '@clerk/clerk-js'
import { pageLocale } from './format'
import type { Locale } from './locales'

export type ClerkLocalization = NonNullable<NonNullable<Parameters<Clerk['load']>[0]>['localization']>
type Tree = { [key: string]: unknown }

/**
 * Clerk's own translations of its panels (ADR-0024), one lazy chunk per language: a build fetches only
 * its own. English needs none, as Clerk is written in it. The version matches `@clerk/clerk-js`.
 */
export const CLERK_BUNDLES: Record<Exclude<Locale, 'en'>, () => Promise<ClerkLocalization>> = {
    es: () => import('@clerk/localizations/es-ES').then((module) => module.esES),
    fr: () => import('@clerk/localizations/fr-FR').then((module) => module.frFR),
    de: () => import('@clerk/localizations/de-DE').then((module) => module.deDE),
    it: () => import('@clerk/localizations/it-IT').then((module) => module.itIT),
}

/** Clerk's panel calls its first page "Profile"; in Board Vault, Profile is how groups see you. */
function overrides(): Tree {
    const signIn = $localize`:Clerk account panel title|Name of the panel from Clerk, the sign-in provider, that manages the username, email address, and password:Sign-in`
    return {
        userProfile: {
            navbar: {
                title: signIn,
                description: $localize`:Under the title of the panel from Clerk, the sign-in provider, that manages the username, email address, and password:Manage how you sign in to Board Vault.`,
                account: signIn,
            },
            start: {
                headerTitle__account: $localize`:Heading of the first page of the panel from Clerk, the sign-in provider, that manages the username, email address, and password:Sign-in details`,
            },
        },
    }
}

/**
 * Clerk's English for the screens Board Vault shows, where Clerk's bundle for a language has no translation
 * yet (it leaves the key undefined, and Clerk falls back to English). Clerk's `{{length}}`-style variables
 * are placeholders, so a translation cannot break them. Billing, organizations, phone numbers, passkeys,
 * single sign-on, and API keys are left out: Board Vault does not use them.
 */
function fills(): Tree {
    const length = '{{length}}'
    const applicationName = '{{applicationName}}'
    const protectCheck = {
        loading: $localize`:Shown by Clerk, the sign-in provider, while it checks that a sign-in is not automated:Loading…`,
        retryButton: $localize`:Button from Clerk, the sign-in provider, after its check that a sign-in is not automated failed:Try again`,
        subtitle: $localize`:Shown by Clerk, the sign-in provider, while it checks that a sign-in is not automated:Please wait while we verify your request.`,
        title: $localize`:Title shown by Clerk, the sign-in provider, while it checks that a sign-in is not automated:Verifying your request`,
    }
    return {
        formFieldInputPlaceholder__signUpPassword: $localize`:Placeholder of the new password field in Clerk, the sign-in provider:Create a password`,
        formFieldInput__emailAddress_format: $localize`:Hint under the email address field in Clerk, the sign-in provider:Example format: name@example.com`,
        signIn: {
            start: {
                titleCombined: $localize`:Title of the sign-in panel from Clerk, the sign-in provider; the placeholder is Board Vault:Continue to ${applicationName}:applicationName:`,
            },
            passwordCompromised: {
                title: $localize`:Title in Clerk, the sign-in provider, when a password appeared in a data breach:Password compromised`,
            },
            passwordUntrusted: {
                title: $localize`:Title in Clerk, the sign-in provider, when a password can no longer be trusted:Password untrusted`,
            },
            protectCheck,
        },
        signUp: { protectCheck },
        userProfile: {
            emailAddressPage: {
                formHint: $localize`:Hint when adding an email address in the account panel from Clerk, the sign-in provider:You'll need to verify this email address before it can be added to your account.`,
            },
        },
        unstable__errors: {
            action_blocked: $localize`:Error from Clerk, the sign-in provider:This action couldn't be completed. Please try again later or contact support if this persists.`,
            form_new_password_matches_current: $localize`:Error from Clerk, the sign-in provider, when changing a password:New password cannot be the same as the current password.`,
            form_password_matches_identifier: $localize`:Error from Clerk, the sign-in provider, when choosing a password:Password cannot match your email address, phone number or username. For account safety, please use a different password.`,
            form_password_untrusted__sign_in: $localize`:Error from Clerk, the sign-in provider, when signing in:Your password may be compromised. To protect your account, please continue with an alternative sign-in method. You will be required to reset your password after signing in.`,
            protect_check_execution_failed: $localize`:Error from Clerk, the sign-in provider, about its check that a sign-in is not automated:Verification didn't complete. Please try again.`,
            protect_check_invalid_script: $localize`:Error from Clerk, the sign-in provider, about its check that a sign-in is not automated:Couldn't load verification. Please contact support if this persists.`,
            protect_check_invalid_sdk_url: $localize`:Error from Clerk, the sign-in provider, about its check that a sign-in is not automated:Verification couldn't start. Please contact support.`,
            protect_check_required: $localize`:Error from Clerk, the sign-in provider, about its check that a sign-in is not automated:This sign-in needs an extra verification step that can't be shown here. Please try again or use a different sign-in method.`,
            protect_check_script_load_failed: $localize`:Error from Clerk, the sign-in provider, about its check that a sign-in is not automated:Couldn't load verification. This may be caused by a network issue or a Content Security Policy that blocks the verification script. Please try again or contact support.`,
            protect_check_timed_out: $localize`:Error from Clerk, the sign-in provider, about its check that a sign-in is not automated:Verification didn't complete in time. Please try again.`,
            protect_check_unsupported_environment: $localize`:Error from Clerk, the sign-in provider, about its check that a sign-in is not automated:Verification isn't supported in this environment. Please continue in a standard browser or contact support.`,
            ticket_expired_code: $localize`:Error from Clerk, the sign-in provider, when an invitation link is too old:This link has expired. Please start again or request a new link.`,
            ticket_invalid_code: $localize`:Error from Clerk, the sign-in provider, when an invitation link was used or withdrawn:This link is no longer valid or has already been used. Please start again or request a new link.`,
            too_many_unverified_identifications: $localize`:Error from Clerk, the sign-in provider, when adding an email address:Too many verifications are pending on this account. Remove an unverified email address, phone number, or wallet you no longer need, or wait a few minutes for an incomplete passkey setup to expire, then try again.`,
            passwordComplexity: {
                maximumLength: $localize`:Ends the sentence Your password must contain, in Clerk, the sign-in provider:less than ${length}:length: characters`,
                minimumLength: $localize`:Ends the sentence Your password must contain, in Clerk, the sign-in provider:${length}:length: or more characters`,
                requireLowercase: $localize`:Ends the sentence Your password must contain, in Clerk, the sign-in provider:a lowercase letter`,
                requireNumbers: $localize`:Ends the sentence Your password must contain, in Clerk, the sign-in provider:a number`,
                requireSpecialCharacter: $localize`:Ends the sentence Your password must contain, in Clerk, the sign-in provider:a special character`,
                requireUppercase: $localize`:Ends the sentence Your password must contain, in Clerk, the sign-in provider:an uppercase letter`,
                sentencePrefix: $localize`:Start of a sentence in Clerk, the sign-in provider, completed by a list such as 8 or more characters:Your password must contain`,
            },
            zxcvbn: {
                couldBeStronger: $localize`:Password strength in Clerk, the sign-in provider:Your password works, but could be stronger. Try adding more characters.`,
                goodPassword: $localize`:Password strength in Clerk, the sign-in provider:Your password meets all the necessary requirements.`,
                notEnough: $localize`:Password strength in Clerk, the sign-in provider:Your password is not strong enough.`,
                suggestions: {
                    allUppercase: $localize`:Password advice in Clerk, the sign-in provider:Capitalize some, but not all letters.`,
                    anotherWord: $localize`:Password advice in Clerk, the sign-in provider:Add more words that are less common.`,
                    associatedYears: $localize`:Password advice in Clerk, the sign-in provider:Avoid years that are associated with you.`,
                    capitalization: $localize`:Password advice in Clerk, the sign-in provider:Capitalize more than the first letter.`,
                    dates: $localize`:Password advice in Clerk, the sign-in provider:Avoid dates and years that are associated with you.`,
                    l33t: $localize`:Password advice in Clerk, the sign-in provider:Avoid predictable letter substitutions like '@' for 'a'.`,
                    longerKeyboardPattern: $localize`:Password advice in Clerk, the sign-in provider:Use longer keyboard patterns and change typing direction multiple times.`,
                    noNeed: $localize`:Password advice in Clerk, the sign-in provider:You can create strong passwords without using symbols, numbers, or uppercase letters.`,
                    pwned: $localize`:Password advice in Clerk, the sign-in provider:If you use this password elsewhere, you should change it.`,
                    recentYears: $localize`:Password advice in Clerk, the sign-in provider:Avoid recent years.`,
                    repeated: $localize`:Password advice in Clerk, the sign-in provider:Avoid repeated words and characters.`,
                    reverseWords: $localize`:Password advice in Clerk, the sign-in provider:Avoid reversed spellings of common words.`,
                    sequences: $localize`:Password advice in Clerk, the sign-in provider:Avoid common character sequences.`,
                    useWords: $localize`:Password advice in Clerk, the sign-in provider:Use multiple words, but avoid common phrases.`,
                },
                warnings: {
                    common: $localize`:Password warning in Clerk, the sign-in provider:This is a commonly used password.`,
                    commonNames: $localize`:Password warning in Clerk, the sign-in provider:Common names and surnames are easy to guess.`,
                    dates: $localize`:Password warning in Clerk, the sign-in provider:Dates are easy to guess.`,
                    extendedRepeat: $localize`:Password warning in Clerk, the sign-in provider:Repeated character patterns like "abcabcabc" are easy to guess.`,
                    keyPattern: $localize`:Password warning in Clerk, the sign-in provider:Short keyboard patterns are easy to guess.`,
                    namesByThemselves: $localize`:Password warning in Clerk, the sign-in provider:Single names or surnames are easy to guess.`,
                    pwned: $localize`:Password warning in Clerk, the sign-in provider:Your password was exposed by a data breach on the Internet.`,
                    recentYears: $localize`:Password warning in Clerk, the sign-in provider:Recent years are easy to guess.`,
                    sequences: $localize`:Password warning in Clerk, the sign-in provider:Common character sequences like "abc" are easy to guess.`,
                    similarToCommon: $localize`:Password warning in Clerk, the sign-in provider:This is similar to a commonly used password.`,
                    simpleRepeat: $localize`:Password warning in Clerk, the sign-in provider:Repeated characters like "aaa" are easy to guess.`,
                    straightRow: $localize`:Password warning in Clerk, the sign-in provider:Straight rows of keys on your keyboard are easy to guess.`,
                    topHundred: $localize`:Password warning in Clerk, the sign-in provider:This is a frequently used password.`,
                    topTen: $localize`:Password warning in Clerk, the sign-in provider:This is a heavily used password.`,
                    userInputs: $localize`:Password warning in Clerk, the sign-in provider:There should not be any personal or page related data.`,
                    wordByItself: $localize`:Password warning in Clerk, the sign-in provider:Single words are easy to guess.`,
                },
            },
        },
    }
}

/** Layers later in the list win; an undefined value, which Clerk's bundles use for "not translated", never does. */
function merge(...layers: Array<Tree>): Tree {
    const result: Tree = {}
    for (const layer of layers) {
        for (const [key, value] of Object.entries(layer)) {
            if (value === undefined) continue
            const current = result[key]
            result[key] = isTree(value) && isTree(current) ? merge(current, value) : isTree(value) ? merge(value) : value
        }
    }
    return result
}

function isTree(value: unknown): value is Tree {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * What Clerk's panels say in the page's language: Clerk's bundle, our text where it has none, then our
 * overrides. If the bundle cannot load, Clerk shows English with our overrides rather than not loading.
 */
export async function clerkLocalization(locale: Locale = pageLocale(), bundles = CLERK_BUNDLES): Promise<ClerkLocalization> {
    if (locale === 'en') return overrides() as ClerkLocalization
    try {
        const bundle = await bundles[locale]()
        return merge(fills(), bundle as Tree, overrides()) as ClerkLocalization
    } catch (error) {
        console.error(`Clerk's ${locale} translation could not be loaded; it stays in English.`, error)
        return overrides() as ClerkLocalization
    }
}
