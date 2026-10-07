# Board Vault design system

This is the public visual and interaction contract for Board Vault. It keeps
the interface calm and legible while the product is still evolving. The
system is intentionally expressed through Tailwind utility classes and shared
components; add a token or component before inventing a one-off treatment.

## Product direction: the game-night table

Board Vault should feel like the table where a group plans, chooses, plays,
and remembers games together:

- **Warm and practical:** the content and the next decision lead. Decorative
  surfaces should support orientation, not compete with the game information.
- **Shared, with clear boundaries:** group context is collaborative, while a
  personal shelf, wishlist, and account settings remain visibly private.
- **Explainable:** recommendations, acquisition intent, attendance, and
  destructive actions should state what the system knows and what will happen.
- **Quiet under pressure:** loading, empty, error, permission, and partial
  states should be useful and actionable rather than theatrical.

## Colour: the "Ciruela" palette

Plum is the primary colour, Sunglow the accent, and the backgrounds are lilac
(light) or plum charcoal (dark). The tokens are CSS variables in
[`styles.css`](../frontend/src/styles.css) and Tailwind colours named
`bv-*`. Each class switches with the theme on its own, so write `bg-bv-surface`,
not `bg-white dark:bg-zinc-900`. **Do not use Tailwind's palette colours
(`zinc`, `indigo`, `red`, …) in templates.**

People choose System (the default, following the device), Light, or Dark in
**Settings → Appearance**. To show the light tokens inside a dark page (as
the Appearance previews do), wrap the element in `class="theme-light"`; `class="dark"`
does the opposite.

| Token | Tailwind class example | Use | Light | Dark |
| --- | --- | --- | --- | --- |
| `--bv-bg` | `bg-bv-bg` | App background | `#F3EDF9` | `#201C20` |
| `--bv-surface` | `bg-bv-surface` | Cards, panels, dialogs | `#FFFFFF` | `#292429` |
| `--bv-surface-2` | `bg-bv-surface-2` | Chips, rows, fields, hover | `#ECE2F4` | `#352D34` |
| `--bv-border` | `border-bv-border` | Borders and dividers | `#DCCDE8` | `#483E46` |
| `--bv-text` | `text-bv-text` | Main text | `#24121E` | `#F6EEF3` |
| `--bv-text-muted` | `text-bv-text-muted` | Secondary text, metadata | `#66505E` | `#BFA9B8` |
| `--bv-primary` | `bg-bv-primary`, `text-bv-primary` | Main action, links, active state | `#8A2C7A` | `#E58AD0` |
| `--bv-on-primary` | `text-bv-on-primary` | Text on primary | `#FFFFFF` | `#3A0B30` |
| `--bv-primary-soft` | `bg-bv-primary-soft` | Labels and soft backgrounds | `#F7E3F1` | `#3D1E36` |
| `--bv-on-primary-soft` | `text-bv-on-primary-soft` | Text on primary-soft | `#6B1B5D` | `#F4B8E4` |
| `--bv-accent` | `bg-bv-accent` | Sunglow: favourites, winners, highlights | `#FFD166` | `#FFD166` |
| `--bv-on-accent` | `text-bv-on-accent` | Text on accent | `#3A0B30` | `#3A0B30` |
| `--bv-success` | `text-bv-success` | Confirmed, reasons for | `#2A7A4B` | `#63C993` |
| `--bv-warning` | `text-bv-warning` | Maybe, warnings | `#8C5A08` | `#F0B65E` |
| `--bv-danger` | `text-bv-danger` | Can't come, errors, destructive actions | `#B3262E` | `#FF7F86` |

`--bv-on-success`, `--bv-on-warning`, and `--bv-on-danger` are our additions
(white in light mode, dark plum in dark mode) for text on a filled status
colour, such as the danger button.

### Rules

- **Primary** only for the main action of a screen and for the active state
  (current tab, selected chip). Other buttons are outlined: `appButton
  variant="secondary"`.
- **Sunglow (accent)** in light mode is always a fill with `on-accent` on top
  (chips, winner badges, the Reviews tile). Never use it as text or a lone
  icon on a light background: it fails contrast (1.4:1). In dark mode it may
  be an icon colour, so rating stars are `text-bv-warning
  dark:text-bv-accent`.
- **primary-soft with on-primary-soft** for informative labels ("In the
  group", "92% match", counts on cards): `<app-badge>`.
- **success, warning, danger** for attendance states and recommendation
  reasons, always with text or an icon, never colour alone. For a tinted
  background use opacity: `bg-bv-danger/10 border-bv-danger/30
  text-bv-danger`. Otherwise don't use them as decoration. The designer
  approved two exceptions: section colours on hub cards (below) and the
  wishlist heart, which is `text-bv-danger`.
- **Hub cards** (`/collection`, `/play`) each get a `tone`. The icon tile
  uses the full colour and the card a faint tint of it, mixed into the
  surface so it stays opaque: My Games `primary`, Browse `success`, Reviews
  `warning`, Wishlist `danger`; Upcoming `primary`, What to play `accent`,
  History `success`, Record a session `warning`. Their count badges use the
  same tone.
- **Player colours** always with the initial or the name visible.
- On a primary fill, secondary text uses `text-bv-on-primary/80`, not a soft
  token.
- Modal backdrops are `bg-black/50` in both themes.
- Tinting a component: `<app-badge>` and `<app-card-section>` take a `tone`
  (`primary`, `accent`, `success`, `warning`, `danger`, `neutral`;
  `types/tone.type.ts`).
- Never pair a `bv-*` colour with `dark:`. The tokens already switch with the
  theme, so `dark:bg-bv-surface` alone leaves the light theme with no
  background (a see-through field). Write `bg-bv-surface`. Use `dark:` only
  to pick a *different* token in dark mode, as the rating stars do.

### Player colours

Eight colours identify players (avatars, owners, winners). Avatars store the
light hex; [`playerColour.ts`](../frontend/src/app/core/utils/playerColour.ts)
renders it through `--bv-player-N` so it follows the theme, and maps colours
from the earlier avatar palette onto the nearest player colour.

| Token | Light | Dark |
| --- | --- | --- |
| `--bv-player-1` | `#C0392B` | `#FF9C8F` |
| `--bv-player-2` | `#B45309` | `#FDBA74` |
| `--bv-player-3` | `#4D7C0F` | `#BEF264` |
| `--bv-player-4` | `#047857` | `#6EE7B7` |
| `--bv-player-5` | `#0E7490` | `#67E8F9` |
| `--bv-player-6` | `#1D4ED8` | `#93C5FD` |
| `--bv-player-7` | `#7E22CE` | `#D8B4FE` |
| `--bv-player-8` | `#BE185D` | `#F9A8D4` |
| `--bv-on-player` | `#FFFFFF` | `#14101A` |

### Contrast (WCAG AA)

Text needs 4.5:1, large text and icons 3:1. Every text pair in the table
above passes in both themes (the lowest is muted text on surface-2, 5.8:1);
the one failing pair is Sunglow as an icon on a light surface (1.4:1), which
the rules above forbid. Check new pairs before adding them.

Use `lucide-angular` icons alongside text; icons are supporting language,
not the only label for an action.

## Type and spacing

- Use the application sans-serif stack already defined by the frontend.
- Use one clear page heading, then short section headings. Do not encode
  hierarchy with color alone.
- Prefer Tailwind's regular spacing scale (`p-4`, `gap-4`, `space-y-6`, and
  their responsive variants). Keep related controls close and separate major
  decisions with generous vertical rhythm.
- Use `text-sm` for supporting metadata, `text-base` for controls and body
  copy, and `text-xl`/`text-2xl` for page and section headings. Increase size
  for hierarchy, not decoration.
- Keep line length comfortable on reading surfaces. Long names, notes, and
  translated titles must wrap rather than force horizontal scrolling.

## Shape, elevation, and interaction

- Use rounded corners consistently: `rounded` for fields and compact
  controls, `rounded-lg` for cards and panels, and `rounded-xl` only for a
  meaningful hero or dialog surface.
- Keep shadows restrained (`shadow-sm` for surfaces, stronger elevation only
  for an open dialog or important floating control).
- Every interactive element needs a visible `focus-visible` ring, a usable
  label, and a disabled state that remains readable.
- Keep touch targets at least approximately 44px high where practical. Do
  not make icon-only controls carry essential meaning without an accessible
  name and a nearby visible explanation when the action is unfamiliar.
- Respect `prefers-reduced-motion`; motion must not be required to understand
  state or complete a task.

### Shared controls

- **Explaining a feature:** `<app-info-popover label="About …">` renders a
  (?) button; put the explanation in its content. A mouse opens it on hover,
  and a click or tap pins it open (touch screens have no hover). Escape or a
  click outside closes it. Say what the feature records, for how long, and
  who can see it.
- **Wishlist:** `<app-wishlist-toggle [game]="game" />` is the heart on a
  game cover (game page, Browse, Wishlist). Position it from the parent
  (`class="absolute right-2 top-2"`). It reads and updates
  `DataService.userWishlist`, slides open to name its action with a mouse or
  keyboard focus, and its toast offers Undo. Hide it once the game is owned.
- **Toggle chips:** `<button type="button" class="app-chip"
  [attr.aria-pressed]="isChosen">` for filters and choices (group, people,
  durations, players). The chosen chip takes the primary fill. Wrap a set in
  a `<fieldset class="min-w-0">` with a `<legend>`: without `min-w-0` a
  fieldset cannot shrink below its widest chip and a long name widens the
  page on phones.
- **Session timing:** `core/utils/sessionTiming.ts` says whether a scheduled
  session is `planned`, `live`, or waiting for results (`wrap-up`, 12 hours
  after it started), and formats date blocks and "in 6 days" labels.
- **Undo:** for a quick, reversible action, act at once and pass an action
  to the toast instead of asking for confirmation first:
  `toastService.success('Removed from your wishlist', { label: 'Undo', run: () => … })`.
  Destructive or shared changes still confirm first.

### Buttons and links

Pick the element by what it does, then the look:

| It… | Element | Looks like a button? |
| --- | --- | --- |
| Runs an action (save, delete, open a modal) | `<button>` | Add `appButton` |
| Goes to another page or URL | `<a routerLink>` or `<a href>` | Add `appButton` if it is a call to action; otherwise a plain styled link |

Navigation is always an `<a>`, even when it looks like a button, so new tab,
middle-click, and "copy link address" work and screen readers announce a link.
Never navigate from a `<button (click)>`.

`appButton` (`components/ui/button/`) is a component that attaches to the
native element, so every attribute and directive (`routerLink`,
`queryParams`, `aria-*`, `form`, `target`) works on it directly:

```html
<button appButton (click)="save()">Save</button>
<button appButton variant="danger" icon="trash" [loading]="isDeleting()">Delete group</button>
<button appButton type="submit" [disabled]="form.invalid" [wide]="true">Create group</button>
<a appButton variant="secondary" routerLink="/collection/browse" icon="plus-lg">Add games</a>
```

- Inputs: `variant` (`primary`, `secondary`, `danger`, `success`, `accent`), `size`
  (`small`, `medium`, `large`), `icon`, `loading`, `disabled`, `wide`, and
  `type` on buttons.
- `type` defaults to `button`; set `type="submit"` for the form's submit
  button.
- `loading` disables the button and swaps the icon for a spinner; the label
  stays.
- `disabled` on a link removes it from the tab order and blocks clicks.
- Import `ButtonComponent` in the component that uses it. Without the import,
  Angular ignores the `appButton` attribute silently and the element renders
  unstyled.
- Do not use the `app-btn-*` classes in templates or rebuild a button from
  colour utilities; they are the component's internals in `styles.css`.
- `accent` is Sunglow with `on-accent` text, only for a call to action on a
  primary band (the landing page's closing card), where a primary button
  would disappear.
- Coloured buttons keep white text in both themes; buttons shrink by 5% while
  pressed. Toggle chips, tabs, menu items, and icon-only controls are not
  buttons in this sense and keep their own styles.

## Logo and app icons

The mark, "Round", is four rounded pieces turning around an empty square: a
pinwheel. Everyone takes a side and the middle is shared, like a group around
the table. It is abstract and one flat colour. Geometry, on a 64×64 viewBox:
four 28×16 pieces with corner radius 3 and 2-unit gaps, filling 9 to 55 (9 of
padding on every side), around a 12×12 empty centre. Keep the proportions;
no strokes or effects.

| File | Use |
| --- | --- |
| `components/ui/logo` (`<app-logo>`) | The mark inline in the app, in `currentColor`: header, footer, landing. |
| `public/images/logo.svg` | The mark as a file, fixed plum, for anything outside the app. |
| `public/favicon.svg` | Browser tab: plum on light, `#E58AD0` on dark (`prefers-color-scheme`). |
| `public/favicon.ico` | Older browsers: 16, 32, and 48 px, plum mark on a lilac square. |
| `public/icons/icon-192.png`, `icon-512.png` | Web manifest icons, plum mark on lilac; `icon-512.png` is also the link-preview image. |
| `public/icons/icon-maskable-512.png` | Android adaptive icon: full-bleed plum with the white mark at 60%, inside the safe zone. |
| `public/icons/apple-touch-icon.png` | iOS home screen (180 px, square; iOS rounds it). |

- **Colour:** plum (`text-bv-primary`) by default. In the app, write
  `<app-logo class="text-bv-primary" />`; the token switches to `#E58AD0` in
  dark mode on its own. On plum or dark fills use white, or Sunglow on the
  plum charcoal. Monochrome: `text-bv-text`, or pure black or white.
- **One mark at every size:** it stays readable down to 16 px, so there is no
  small-size variant.
- **Lockup:** the mark sits left of "Board Vault" in the app's sans-serif,
  bold. The gap is about 0.3× the mark's height and the mark about 1.3× the
  text's cap height (header: 28 px mark, `text-2xl`, `gap-2`). Never put text
  inside the mark.
- [`manifest.webmanifest`](../frontend/public/manifest.webmanifest) makes the
  app installable (standalone, starts at `/dashboard`). There is no service
  worker: nothing is cached offline, so signed-in data is never stale.

## Layout patterns

- **App shell:** one landmark, one page heading, responsive navigation, and a
  current-group context when group-scoped content is shown.
- **Decision surface:** explain the decision first, then expose secondary
  details such as scores, history, or technical metadata.
- **Collection surface:** distinguish private shelf, personal wishlist, and
  group acquisition intent in both copy and visual grouping.
- **Session surface:** show lifecycle state, attendance, games, and the next
  action together. Destructive completion or cancellation requires an
  explicit confirmation.
- **Product samples (landing page):** small samples of the app, never
  screenshots, filled from `pages/landing/landing.fixtures.ts` (the example
  group "Friday Crew") and set in plain surface cards. Reuse a real
  component where it fits (`app-recommendation-card`, `review-display`,
  `app-image-profile`); the rest is light markup. Only our own artwork from
  `public/images/landing/` appears: made-up games, never publisher box art.
  A sample shows no controls that do nothing: either it works (the shelf
  filter chips) or it is plain text. A card that floats above the page uses
  `shadow-bv-lift`.
- **State surface:** loading, empty, error, permission, and partial-failure
  messages belong near the affected content and should include the safest
  useful next action.

## Review checklist for new UI

- Does the page tell a member what this surface is and what to do next?
- Is the privacy boundary visible before a user changes shared data?
- Does the light and dark theme keep text, icons, controls, borders, and
  focus states readable?
- Are text labels, keyboard behavior, error recovery, and reduced motion
  covered?
- Can long names, notes, empty values, and translated copy wrap safely?
- Is the treatment reusable, or should it become a shared component/token?
