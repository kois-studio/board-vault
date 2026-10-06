import { Routes } from '@angular/router'
import { AdminGuard } from './core/guards/admin.guard'
import { AuthOnlyGuard, SHOWS_AUTH_HANDOFF } from './core/guards/auth.guard'
import { GuestOnlyGuard } from './core/guards/auth-redirect.guard'
import { LayoutBasicComponent } from './layout/layout-basic/layout-basic.component'
import { LayoutCompleteComponent } from './layout/layout-complete/layout-complete.component'
import { LandingComponent } from './pages/landing/landing.component'

/**
 * Which route uses LayoutBasicComponent and which uses LayoutCompleteComponent?
 * The idea is to differentiate between when the user is making an *action* or only visualizing information.
 *
 * `LayoutBasicComponent`: you are executing an action that will change the state of the application.
 *    - CRUD actions (create a new group or edit its data)
 *
 * `LayoutCompleteComponent`: you are only visualizing information.
 *   - dashboard
 *   - group details
 *
 * The reason is that by doing this, the user gets a "focused" experience on the action they are doing. 0 distractions.
 */
export const routes: Routes = [
    {
        path: '',
        component: LayoutCompleteComponent,
        data: { [SHOWS_AUTH_HANDOFF]: true },
        children: [
            // Administration: inside the app layout, still a lazy chunk only admins download.
            {
                path: 'admin',
                loadChildren: () => import('./modules/admin/admin.routes').then((r) => r.ADMIN_ROUTES),
                canActivate: [AdminGuard],
            },
            // accessible to everyone. Bundled with the app, not lazy: it is the first page most visitors see, and
            // a separate chunk costs a round trip before its largest paint (#92). Its samples are still deferred.
            { path: '', component: LandingComponent }, // cannot move it to routes[n>0] unless routes[0].path !== ''
            // accessible to unauthenticated users
            {
                path: 'login',
                loadComponent: () => import('./pages/auth/login/login.component').then((m) => m.LoginComponent),
                canActivate: [GuestOnlyGuard],
            },
            {
                path: 'register',
                loadComponent: () => import('./pages/auth/register/register.component').then((m) => m.RegisterComponent),
                canActivate: [GuestOnlyGuard],
            },
            // accessible to authenticated users
            {
                path: 'dashboard',
                loadComponent: () => import('./pages/dashboard-page/dashboard-page.component').then((m) => m.DashboardPageComponent),
                canActivate: [AuthOnlyGuard],
            },
            {
                // Groups live on Home now; keep old links working.
                path: 'groups',
                pathMatch: 'full',
                redirectTo: 'dashboard',
            },
            {
                path: 'submissions',
                loadComponent: () =>
                    import('./pages/dashboard-page/submissions-page/submissions-page.component').then((m) => m.SubmissionsPageComponent),
                canActivate: [AuthOnlyGuard],
            },
            {
                path: 'collection',
                loadComponent: () => import('./pages/collection-page/collection-page.component').then((m) => m.CollectionPageComponent),
                canActivate: [AuthOnlyGuard],
            },
            {
                path: 'collection/games',
                loadComponent: () =>
                    import('./pages/collection-page/my-games-page/my-games-page.component').then((m) => m.MyGamesPageComponent),
                canActivate: [AuthOnlyGuard],
            },
            {
                path: 'collection/browse',
                loadComponent: () => import('./pages/collection-page/browse-page/browse-page.component').then((m) => m.BrowsePageComponent),
                canActivate: [AuthOnlyGuard],
            },
            {
                path: 'collection/reviews',
                loadComponent: () =>
                    import('./pages/collection-page/reviews-page/reviews-page.component').then((m) => m.ReviewsPageComponent),
                canActivate: [AuthOnlyGuard],
            },
            {
                path: 'collection/wishlist',
                loadComponent: () =>
                    import('./pages/collection-page/wishlist-page/wishlist-page.component').then((m) => m.WishlistPageComponent),
                canActivate: [AuthOnlyGuard],
            },
            {
                path: 'games/:gameId',
                loadComponent: () => import('./pages/games/game-view/game-view.component').then((m) => m.GameViewPageComponent),
                canActivate: [AuthOnlyGuard],
            },
            {
                path: 'play',
                loadComponent: () => import('./pages/play-page/play-page.component').then((m) => m.PlayPageComponent),
                canActivate: [AuthOnlyGuard],
            },
            {
                path: 'play/recommendations',
                loadComponent: () =>
                    import('./pages/play-page/recommendations-page/recommendations-page.component').then(
                        (m) => m.RecommendationsPageComponent,
                    ),
                canActivate: [AuthOnlyGuard],
            },
            {
                path: 'play/log-session',
                loadComponent: () =>
                    import('./pages/play-page/log-session-page/log-session-page.component').then((m) => m.LogSessionPageComponent),
                canActivate: [AuthOnlyGuard],
            },
            {
                path: 'play/upcoming-sessions',
                loadComponent: () =>
                    import('./pages/play-page/upcoming-sessions-page/upcoming-sessions-page.component').then(
                        (m) => m.UpcomingSessionsPageComponent,
                    ),
                canActivate: [AuthOnlyGuard],
            },
            {
                path: 'play/history',
                loadComponent: () => import('./pages/play-page/history-page/history-page.component').then((m) => m.HistoryPageComponent),
                canActivate: [AuthOnlyGuard],
            },
            {
                path: 'groups/:groupId',
                loadComponent: () => import('./pages/group-view/group-view.component').then((m) => m.GroupViewComponent),
                canActivate: [AuthOnlyGuard],
            },
            {
                path: 'sessions/:sessionId',
                loadComponent: () => import('./pages/meet-view/meet-view.component').then((m) => m.MeetViewComponent),
                canActivate: [AuthOnlyGuard],
            },
            {
                path: 'meets/:meetId',
                redirectTo: 'sessions/:meetId',
                pathMatch: 'full',
            },
            {
                path: 'settings',
                loadComponent: () => import('./pages/settings/settings.component').then((m) => m.SettingsPageComponent),
                canActivate: [AuthOnlyGuard],
                children: [
                    // No default child: on phones /settings is the list of sections (SidebarLayoutComponent).
                    {
                        path: 'profile',
                        loadComponent: () =>
                            import('./pages/settings/account/settings-account.component').then((m) => m.SettingsAccountComponent),
                        canActivate: [AuthOnlyGuard],
                    },
                    { path: 'account', redirectTo: 'profile', pathMatch: 'full' },
                    {
                        path: 'appearance',
                        loadComponent: () =>
                            import('./pages/settings/appearance/settings-appearance.component').then((m) => m.SettingsAppearanceComponent),
                        canActivate: [AuthOnlyGuard],
                    },
                    {
                        path: 'security',
                        loadComponent: () =>
                            import('./pages/settings/security/settings-security.component').then((m) => m.SettingsSecurityComponent),
                        canActivate: [AuthOnlyGuard],
                    },
                ],
            },
        ],
    },
    {
        path: '',
        component: LayoutBasicComponent,
        children: [
            // accessible to authenticated users
            {
                path: 'create-group',
                loadComponent: () => import('./pages/groups/group-create/group-create.component').then((m) => m.GroupCreateComponent),
                canActivate: [AuthOnlyGuard],
            }, // 'group/new' would break in 'group/:groupId'
            {
                path: 'groups/:groupId/sessions/new',
                loadComponent: () => import('./pages/meet-new/meet-new.component').then((m) => m.MeetNewComponent),
                canActivate: [AuthOnlyGuard],
            },
            {
                path: 'groups/:groupId/meets/new',
                redirectTo: 'groups/:groupId/sessions/new',
                pathMatch: 'full',
            },
            {
                path: 'groups/:groupId/edit',
                loadComponent: () => import('./pages/groups/group-edit/group-edit.component').then((m) => m.GroupEditComponent),
                canActivate: [AuthOnlyGuard],
            },
            {
                path: 'groups/:groupId/people/:personId/claim',
                loadComponent: () =>
                    import('./pages/group-person-claim/group-person-claim.component').then((m) => m.GroupPersonClaimComponent),
                canActivate: [AuthOnlyGuard],
            },
            {
                path: 'groups/:groupId/leave',
                loadComponent: () => import('./pages/groups/group-action-redirect.component').then((m) => m.GroupActionRedirectComponent),
                data: { target: 'leave' },
                canActivate: [AuthOnlyGuard],
            },
            {
                path: 'groups/:groupId/delete',
                loadComponent: () => import('./pages/groups/group-action-redirect.component').then((m) => m.GroupActionRedirectComponent),
                data: { target: 'delete' },
                canActivate: [AuthOnlyGuard],
            },
            {
                path: 'collection/propose-game',
                loadComponent: () =>
                    import('./pages/collection-page/propose-game-page/propose-game-page.component').then((m) => m.ProposeGamePageComponent),
                canActivate: [AuthOnlyGuard],
            },
        ],
    },
    {
        path: '**',
        loadComponent: () => import('./pages/errors/page-not-found/page-not-found.component').then((m) => m.PageNotFoundComponent),
    }, // Wildcard route for a 404 page
]
