# Add a page

1. **Create the component** in `frontend/src/app/pages/<name>/` as a
   standalone component. Reuse `components/ui/` primitives and follow
   [design-system.md](../design-system.md); buttons and button-like links
   use `appButton` on a native `<button>` or `<a>`
   ([Buttons and links](../design-system.md#buttons-and-links)). Declare inputs and outputs with
   `input()`, `input.required()`, and `output()`, not the `@Input` and
   `@Output` decorators.
2. **Register the route** in `frontend/src/app/app.routes.ts` with
   `loadComponent`. Signed-in pages use `canActivate: [AuthOnlyGuard]`. Use
   `LayoutCompleteComponent` for browsing and `LayoutBasicComponent` for a
   focused action. Add its title and description to `getPageMetadata()` in
   `app.component.ts`.
3. **Load data through `Api`** (`frontend/src/app/api/api.ts`). Every
   response is parsed by a zod schema in `api.schemas.ts`; add one for new
   endpoints.
4. **Handle every state**: loading, empty, error with retry, no permission,
   and mobile width ([ux-flows.md](../ux-flows.md)). Hidden buttons are not
   security; the API must still reject the action.
5. **Accessibility**: one `h1`, labelled form controls, buttons with
   `type="button"` unless they submit, links with real `routerLink`s. To link
   to a section of the same page, use `<a appInPageLink="section-id">`
   (`components/ui/in-page-link/`), not `href="#section-id"`: with
   `<base href="/">` a bare fragment resolves to `/#section-id` and reloads the
   app on the landing page.
6. **Translate** ([i18n.md](../i18n.md)): mark every text people read with
   `i18n` in the template and `$localize` in TypeScript, including the title
   and description in `getPageMetadata()`, with a description of where it
   appears. Plurals are ICU expressions, dates and numbers go through
   `core/i18n/format.ts`, and no sentence is built by concatenation. Run
   `npm run i18n:extract`, then add the Spanish, French, German, and Italian
   translations with `npm run i18n:missing` and `npm run i18n:apply`, using
   the [glossary](../i18n.md#glossary). Administration pages stay English.
7. **Test**: a component spec for logic, and a Playwright journey in
   `frontend/e2e/` for the main path. Public pages are covered by
   `public-a11y-audit.spec.ts`; add the route there if it is public.

Checks: `cd frontend && npm run lint:check && npm test -- --watch=false && npm run build`.
`npm run build` fails when a translation is missing; look at the page in
another language with `npm run start:es`.
