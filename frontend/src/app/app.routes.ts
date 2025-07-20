import { Routes } from '@angular/router'
import { AdminGuard } from './core/guards/admin.guard'
import { GuestOnlyGuard } from './core/guards/auth-redirect.guard'
import { AuthOnlyGuard } from './core/guards/auth.guard'
import { LayoutBasicComponent } from './layout/layout-basic/layout-basic.component'
import { LayoutCompleteComponent } from './layout/layout-complete/layout-complete.component'
import { AdminPageComponent } from './modules/admin/components/admin-page/admin-page.component'
import { LoginComponent } from './pages/auth/login/login.component'
import { RegisterComponent } from './pages/auth/register/register.component'
import { ResetPasswordRequestComponent } from './pages/auth/reset-password-request/reset-password-request.component'
import { ResetPasswordTokenComponent } from './pages/auth/reset-password-token/reset-password-token.component'
import { VerifyEmailComponent } from './pages/auth/verify-email/verify-email.component'
import { BrowsePageComponent } from './pages/collection-page/browse-page/browse-page.component'
import { CollectionPageComponent } from './pages/collection-page/collection-page.component'
import { MyGamesPageComponent } from './pages/collection-page/my-games-page/my-games-page.component'
import { ReviewsPageComponent } from './pages/collection-page/reviews-page/reviews-page.component'
import { WishlistPageComponent } from './pages/collection-page/wishlist-page/wishlist-page.component'
import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page.component'
import { SubmissionsPageComponent } from './pages/dashboard-page/submissions-page/submissions-page.component'
import { PageNotFoundComponent } from './pages/errors/page-not-found/page-not-found.component'
import { GameViewPageComponent } from './pages/games/game-view/game-view.component'
import { GroupDeleteComponent } from './pages/group-delete/group-delete.component'
import { GroupLeaveComponent } from './pages/group-leave/group-leave.component'
import { GroupViewComponent } from './pages/group-view/group-view.component'
import { GroupCreateComponent } from './pages/groups/group-create/group-create.component'
import { GroupEditComponent } from './pages/groups/group-edit/group-edit.component'
import { GroupsPageComponent } from './pages/groups/groups-page/groups-page.component'
import { LandingComponent } from './pages/landing/landing.component'
import { MeetConfirmComponent } from './pages/meet-confirm/meet-confirm.component'
import { MeetNewComponent } from './pages/meet-new/meet-new.component'
import { MeetViewComponent } from './pages/meet-view/meet-view.component'
import { HistoryPageComponent } from './pages/play-page/history-page/history-page.component'
import { PlayPageComponent } from './pages/play-page/play-page.component'
import { UpcomingSessionsPageComponent } from './pages/play-page/upcoming-sessions-page/upcoming-sessions-page.component'
import { SettingsAccountComponent } from './pages/settings/account/settings-account.component'
import { SettingsContactComponent } from './pages/settings/contact/settings-contact.component'
import { SettingsSecurityComponent } from './pages/settings/security/settings-security.component'
import { SettingsPageComponent } from './pages/settings/settings.component'

/**
 * Which route uses LayoutBasicComponent and which uses LayoutCompleteComponent?
 * The idea is to differentiate between when the user is making an *action* or only visualizing information.
 *
 * `LayoutBasicComponent`: you are executing an action that will change the state of the application.
 *    - auth actions (login, register, recover password, etc)
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
        path: 'admin',
        loadChildren: () => import('./modules/admin/admin.routes').then((r) => r.ADMIN_ROUTES),
        canActivate: [AdminGuard],
    },
    {
        path: '',
        component: LayoutCompleteComponent,
        children: [
            // accessible to everyone
            { path: '', component: LandingComponent }, // cannot move it to routes[n>0] unless routes[0].path !== ''
            // accessible to unauthenticated users
            { path: 'login', component: LoginComponent, canActivate: [GuestOnlyGuard] },
            { path: 'register', component: RegisterComponent, canActivate: [GuestOnlyGuard] },
            // accessible to authenticated users
            { path: 'dashboard', component: DashboardPageComponent, canActivate: [AuthOnlyGuard] },
            { path: 'groups', component: GroupsPageComponent, canActivate: [AuthOnlyGuard] },
            { path: 'submissions', component: SubmissionsPageComponent, canActivate: [AuthOnlyGuard] },
            { path: 'collection', component: CollectionPageComponent, canActivate: [AuthOnlyGuard] },
            { path: 'collection/games', component: MyGamesPageComponent, canActivate: [AuthOnlyGuard] },
            { path: 'collection/browse', component: BrowsePageComponent, canActivate: [AuthOnlyGuard] },
            { path: 'collection/reviews', component: ReviewsPageComponent, canActivate: [AuthOnlyGuard] },
            { path: 'collection/wishlist', component: WishlistPageComponent, canActivate: [AuthOnlyGuard] },
            { path: 'games/:gameId', component: GameViewPageComponent, canActivate: [AuthOnlyGuard] },
            { path: 'play', component: PlayPageComponent, canActivate: [AuthOnlyGuard] },
            { path: 'play/upcoming-sessions', component: UpcomingSessionsPageComponent, canActivate: [AuthOnlyGuard] },
            { path: 'play/history', component: HistoryPageComponent, canActivate: [AuthOnlyGuard] },
            { path: 'groups/:groupId', component: GroupViewComponent, canActivate: [AuthOnlyGuard] },
            { path: 'meets/:meetId', component: MeetViewComponent, canActivate: [AuthOnlyGuard] },
            {
                path: 'settings',
                component: SettingsPageComponent,
                canActivate: [AuthOnlyGuard],
                children: [
                    { path: '', redirectTo: 'account', pathMatch: 'full' },
                    { path: 'account', component: SettingsAccountComponent, canActivate: [AuthOnlyGuard] },
                    { path: 'security', component: SettingsSecurityComponent, canActivate: [AuthOnlyGuard] },
                    { path: 'contact', component: SettingsContactComponent, canActivate: [AuthOnlyGuard] },
                ],
            },
        ],
    },
    {
        path: '',
        component: LayoutBasicComponent,
        children: [
            // accessible to unauthenticated users
            { path: 'verify-email/:token', component: VerifyEmailComponent, canActivate: [GuestOnlyGuard] },
            { path: 'reset-password/request', component: ResetPasswordRequestComponent, canActivate: [GuestOnlyGuard] },
            { path: 'reset-password/:token', component: ResetPasswordTokenComponent, canActivate: [GuestOnlyGuard] },
            // accessible to authenticated users
            { path: 'create-group', component: GroupCreateComponent, canActivate: [AuthOnlyGuard] }, // 'group/new' would break in 'group/:groupId'
            { path: 'groups/:groupId/meets/new', component: MeetNewComponent, canActivate: [AuthOnlyGuard] }, // 'meets/new' would break in 'meets/:meetId'
            { path: 'groups/:groupId/edit', component: GroupEditComponent, canActivate: [AuthOnlyGuard] },
            { path: 'groups/:groupId/leave', component: GroupLeaveComponent, canActivate: [AuthOnlyGuard] },
            { path: 'groups/:groupId/delete', component: GroupDeleteComponent, canActivate: [AuthOnlyGuard] },
            { path: 'meets/:meetId/confirm', component: MeetConfirmComponent, canActivate: [AuthOnlyGuard] },
        ],
    },
    { path: '**', component: PageNotFoundComponent }, // Wildcard route for a 404 page
]
