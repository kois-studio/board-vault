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

## Semantic color tokens

Use the existing Tailwind palette through semantic roles. Pair every light
theme value with a dark theme value and check text, icons, borders, focus
rings, and disabled states together.

| Role | Light theme | Dark theme | Use |
| --- | --- | --- | --- |
| Canvas | `white` | `zinc-950` | App background and private pages |
| Surface | `zinc-50` | `zinc-900` | Cards, panels, and grouped content |
| Raised surface | `white` | `zinc-900` | Dialogs and elevated controls |
| Border | `zinc-200` | `zinc-800` | Separation without heavy decoration |
| Primary text | `zinc-900` | `zinc-100` | Headings and essential values |
| Secondary text | `zinc-600` | `zinc-400` | Supporting explanation and metadata |
| Action | `indigo-600` | `indigo-500` | Primary actions, links, active navigation |
| Success | `emerald-600` | `emerald-400` | Confirmed or completed state |
| Warning | `amber-600` | `amber-400` | Attention needed before continuing |
| Destructive | `red-600` | `red-400` | Irreversible or privacy-sensitive action |

The semantic role matters more than the exact shade. Avoid introducing a new
brand color for a single page. Use `lucide-angular` icons alongside text;
icons are supporting language, not the only label for an action.

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

### Buttons

- Use `<app-button>` (`components/ui/button/`) for actions. Set `link` to
  make it navigate; it then renders a real link. Variants: `primary`,
  `secondary`, `danger`, `success`; sizes: `small`, `medium`, `large`.
- A link or native `<button>` that must look like a button uses the same
  classes: one of `app-btn-primary`, `app-btn-secondary`, `app-btn-danger`,
  `app-btn-success`, plus `app-btn-sm` or `app-btn-lg` if needed. Do not
  rebuild a button from colour utilities.
- Coloured buttons keep white text in both themes; buttons shrink by 5% while
  pressed. Toggle chips, tabs, and menu items are not buttons in this sense
  and keep their own styles.

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
