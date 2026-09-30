# Add a page

1. **Create the component** in `frontend/src/app/pages/<name>/` as a
   standalone component. Reuse `components/ui/` primitives and follow
   [design-system.md](../design-system.md).
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
   `type="button"` unless they submit, links with real `routerLink`s.
6. **Test**: a component spec for logic, and a Playwright journey in
   `frontend/e2e/` for the main path. Public pages are covered by
   `public-a11y-audit.spec.ts`; add the route there if it is public.

Checks: `cd frontend && npm run lint:check && npm test -- --watch=false && npm run build`.
