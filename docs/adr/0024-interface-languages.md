# ADR: Interface languages

- **Status:** Accepted
- **Date:** 2026-10-25
- **Supersedes:** None
- **Superseded by:** None

## Context

Board Vault is English-only. Before registration opens to the public (#157,
the 1.0 release), the landing page and the app must be usable in more than one
language, starting with Spanish: the team and the first groups are in Spain,
and the Spanish landing copy has been waiting since the redesign (#99).

What the code has today:

- `@angular/localize` is installed and loaded in the polyfills, and
  `angular.json` has an `extract-i18n` target, but no string is marked.
- `components/language-selector/` is an unused prototype with its own
  dictionary. It is not mounted anywhere.
- About 950 text nodes and 100 text attributes in 99 templates, plus about
  175 toasts and other strings in TypeScript. About 65 places build a plural
  by hand (`n === 1 ? '' : 's'`), and several build a sentence by
  concatenation (`'Add ' + title + ' to your collection'`), which cannot be
  translated as it is.
- Dates and numbers use fixed locales: `en-GB`, `en-US`, and `en-CA` in about
  ten places; the currency pipe uses Angular's default locale.
- The API writes English sentences into data. `ActivityNotifier` stores each
  notification's `message` as English prose, with the date already formatted
  in `en-GB`; recommendation reasons and `noResultReason` are English
  sentences built in `play.service.ts`; a deleted account is stored and
  returned as the literal `"Deleted account"` (ADR-0018).
- Tag and tag category names are English catalogue data.
- Clerk renders sign-in, sign-up, and the account panel in English, with a
  few overrides in `clerk.service.ts`.
- The frontend is a static single-page build on Vercel. The landing must be
  indexable after launch, in each language, with correct `hreflang` links;
  today `robots.txt` and the page metadata forbid indexing.

Game titles are a separate concern: which title a game shows follows the
editions people own, not only the interface language (ADR-0025).

## Decision

### Languages

- The interface ships in **English** (`en`, the source language),
  **Spanish** (`es`), **French** (`fr`), **German** (`de`), and **Italian**
  (`it`) for 1.0, which covers most people in the EU. Spanish is written for
  Spain (tú, vosotros), as in the landing copy; a Latin American variant
  would be its own locale (`es-419`) if it is ever wanted.
- A language is **offered** (in the language menu and in the redirect of an
  address without a prefix) only when every message is translated. Every
  build contains every language, but the list of offered languages
  (`OFFERED_LOCALES`) grows as each one is finished, so a half-translated
  language is never shown to anyone who did not type its address. A native
  speaker reviews French, German, and Italian before launch.
- More languages (Portuguese, Dutch, …) follow the same path later.
- The Administration area stays English. It is internal tooling for a few
  people, and leaving it out keeps 1.0 smaller.

### Build-time `@angular/localize`, one build per language

The app uses Angular's own i18n: `i18n` attributes in templates, `$localize`
in TypeScript, ICU expressions for plurals and selects. The English text
stays in the templates, so a template reads the same as today.

`ng build --localize` compiles once and inlines each language, so a build
produces `browser/en/` and `browser/es/`, each with its own `<html lang>`,
`LOCALE_ID`, and locale data. There is no translation lookup at runtime and no
extra request before the first paint.

- Messages are extracted to XLIFF 2.0 (`frontend/src/locale/messages.xlf`
  and `messages.es.xlf`). IDs are Angular's generated ones; a message whose
  English changes becomes untranslated again, which is what we want. A merge
  step keeps the existing translations when the source is extracted again.
- An ambiguous message carries a meaning and a description, so a
  translator knows where it appears:
  `<button i18n="game night|Starts the session">Start</button>`.
- The production build fails on a missing translation
  (`i18nMissingTranslation: error`). Every change that adds or edits a
  user-facing string adds every language in the same pull request. CI also
  fails when the extracted source is stale.
- Changing language is a full page load into the other build. It is a rare
  action, and a reload also gives Clerk its new language.

### Addresses

Every page lives under its language: `/en/…` and `/es/…`
(`board-vault.com/es/groups/12`). Each build is served from its prefix with
its own single-page fallback.

- An address without a prefix (`/`, `/dashboard`, an old bookmark, the
  installed app's `start_url`, Clerk's invitation redirect to `/register`)
  answers with a temporary redirect to the same path in the visitor's
  language: the `bv_lang` cookie when it exists, otherwise the best match for
  `Accept-Language`, otherwise English. This runs in Vercel Routing Middleware
  for those paths only; files and prefixed pages never reach it.
- The landing has a canonical address per language and `hreflang` links to
  the others, with `x-default` pointing to `/en/`. Search engines are never
  redirected away from a prefixed page.

### Who chooses the language

1. **The address** decides what is shown. A link someone shares opens in the
   language it was shared in.
2. **An explicit choice** (the language menu on the landing and in the
   header, or Settings) writes the `bv_lang` cookie and moves to the same
   page in the new prefix. The cookie stores only the language code, is set
   only when someone asks for a language, and lasts a year. It is a
   preference the visitor requested, like the stored colour scheme, so it
   needs no consent banner.
3. **Signed in**, the account's language wins: `Account.locale` (NULL until
   someone chooses one). On sign-in, a different language moves the
   person to their own prefix once. Choosing a language in Settings saves it
   on the account and writes the cookie. A new account starts with the
   language it signed up in.

### Formatting

Dates, times, numbers, and money use the build's `LOCALE_ID` through Angular
pipes or one shared `Intl` helper. No component names a locale. The
`en-CA` formatter that makes `YYYY-MM-DD` day keys stays, renamed to say it
is a data format, not a display format. Collection worth stays in euros
(ADR-0016) and is formatted for the language (`≈ 120 €` in Spanish).

### The API sends facts, the interface writes sentences

The API stops writing English for people to read:

- **Notifications** are rendered by the frontend from `type` and `data`. The
  data holds ids, names as they are, and the session's date and time zone,
  never a formatted date. The `message` column stays for rows written before
  the change and is shown only when a type has no renderer.
- **Recommendation reasons** become codes with values
  (`{ code: 'owned_by', owners: 2, attendees: 5 }`), and so does the
  no-result reason.
- **A deleted account** is a standing (`deleted`), not a name; the frontend
  writes "Deleted account" or "Cuenta eliminada" (ADR-0018 keeps its meaning).
- **Error responses** keep their stable `code`; the frontend owns the text.
  The English `message` stays for logs and for Administration.

Every request carries `Accept-Language` with the build's language, set by
the auth interceptor. The API reads it into `request.locale`, limited to the
supported languages. A cached response whose content depends on the
language includes it in its key.

### Catalogue vocabulary

Tag and tag category names are interface vocabulary ("Cooperative",
"Cooperativo"), so they follow the interface language: a `TagTranslation`
table with a name per language, English required, maintained in
Administration. Game titles are not vocabulary (ADR-0025).

### Clerk

Clerk's components get the matching `@clerk/localizations` bundle (`esES`,
`frFR`, `deDE`, `itIT`), fetched only by pages in that language, merged with
our own overrides, which are translated like any other message.

### Email stays English

Board Vault sends no email of its own; Clerk sends the sign-in codes and
invitations. Those stay in English for 1.0: they are short, the code or link
in them works in any language, and mail apps translate. Revisit if Clerk
sends email in each user's language, or when Board Vault sends its own.

### Analytics do not record the language

Usage analytics (ADR-0021) are for funnels and do not gain a language or
country dimension. Where visitors come from is a question for cookie-less
hosting analytics, if it is ever asked.

### Quality

- A development-only pseudo-locale (accented, 30% longer text) shows any
  string that was not marked and any layout that breaks with longer text.
- The end-to-end suite and the screenshots stay in English. A Spanish smoke
  journey and the public accessibility audit run on `/es/` as well.
- A game title in a language other than the page's carries its own `lang`
  attribute, so screen readers pronounce it right (ADR-0025).
- A translation guide in `docs/i18n.md` holds the glossary
  (group person, shelf, game night, …) for every language, the tone (tú, du, tu; neutral wording
  instead of gendered forms), and how to mark a string, a plural, and a date.

## Consequences

- Templates and TypeScript stay in readable English; translators work on two
  XLIFF files that any translation tool (including a hosted one such as
  Weblate's free plan for open-source projects) can open later.
- No missing translation can reach production, at the cost of every
  user-facing change needing every language in the same pull request.
- Each language is a separate static build with no runtime cost, but the
  development server serves one language at a time (`npm run start:es`).
- Vercel needs routing for the prefixes, the single-page fallback per
  language, and a middleware for unprefixed addresses.
- Notifications, recommendations, and deleted accounts change shape in the
  API contract; old notification rows keep their English text.
- Changing language reloads the page.

## Alternatives considered

- **Runtime `@angular/localize` (`loadTranslations` before bootstrap):** one
  build and no prefixes, but the translations must be fetched before the app
  starts, switching still needs a reload, and without prefixes the landing
  cannot have an indexable address per language.
- **Transloco or ngx-translate:** live switching without a reload and lazy
  translation files, but templates fill with invented keys, missing keys are
  found at runtime rather than at build time, and it adds a dependency for a
  benefit (switching without a reload) we do not need.
- **A dictionary of our own** (the `language-selector` prototype): no
  plurals, no ICU, no extraction or tooling; it would grow into a worse copy
  of the above.
- **English without a prefix, other languages prefixed:** fewer redirects,
  but two kinds of address and a special case in every redirect rule.

## Amendment (2026-10-26)

Clerk's French and German bundles address the reader formally (`vous`,
`Sie`), while Board Vault never does. Inside Clerk's panels we keep Clerk's
wording for 1.0: rewriting about a hundred of its strings per language would
fork its translations and have to follow every Clerk update. The text Board
Vault adds there (its own names, and the strings Clerk leaves in English)
follows Clerk's address, so each panel reads consistently. The native-speaker
review (#189) checks these panels too; revisit if they read badly.
