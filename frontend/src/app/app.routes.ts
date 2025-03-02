import { Routes } from '@angular/router'
import { GuestOnlyGuard } from './core/guards/auth-redirect.guard'
import { AuthOnlyGuard } from './core/guards/auth.guard'
import { LayoutBasicComponent } from './layout/layout-basic/layout-basic.component'
import { LayoutCompleteComponent } from './layout/layout-complete/layout-complete.component'
import { LoginComponent } from './pages/auth/login/login.component'
import { RegisterComponent } from './pages/auth/register/register.component'
import { ResetPasswordRequestComponent } from './pages/auth/reset-password-request/reset-password-request.component'
import { ResetPasswordTokenComponent } from './pages/auth/reset-password-token/reset-password-token.component'
import { VerifyEmailComponent } from './pages/auth/verify-email/verify-email.component'
import { CollectionPageComponent } from './pages/collection-page/collection-page.component'
import { ReviewsPageComponent } from './pages/collection-page/reviews-page/reviews-page.component'
import { DashboardComponent } from './pages/dashboard/dashboard.component'
import { GamesComponent } from './pages/games/games.component'
import { GroupDeleteComponent } from './pages/group-delete/group-delete.component'
import { GroupEditComponent } from './pages/group-edit/group-edit.component'
import { GroupLeaveComponent } from './pages/group-leave/group-leave.component'
import { GroupNewComponent } from './pages/group-new/group-new.component'
import { GroupViewComponent } from './pages/group-view/group-view.component'
import { GroupsPageComponent } from './pages/groups/groups-page.component'
import { MyGroupsComponent } from './pages/groups/my-groups/my-groups.component'
import { HistoryComponent } from './pages/history/history.component'
import { LandingComponent } from './pages/landing/landing.component'
import { MeetConfirmComponent } from './pages/meet-confirm/meet-confirm.component'
import { MeetNewComponent } from './pages/meet-new/meet-new.component'
import { MeetViewComponent } from './pages/meet-view/meet-view.component'
import { PageNotFoundComponent } from './pages/page-not-found/page-not-found.component'
import { PlayPageComponent } from './pages/play-page/play-page.component'
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
        path: '',
        component: LayoutCompleteComponent,
        children: [
            // accessible to everyone
            { path: '', component: LandingComponent }, // cannot move it to routes[n>0] unless routes[0].path !== ''
            // accessible to authenticated users
            { path: 'dashboard', component: DashboardComponent, canActivate: [AuthOnlyGuard] },
            { path: 'games', component: GamesComponent, canActivate: [AuthOnlyGuard] },
            { path: 'collection', component: CollectionPageComponent, canActivate: [AuthOnlyGuard] },
            { path: 'collection/reviews', component: ReviewsPageComponent, canActivate: [AuthOnlyGuard] },
            { path: 'groups', component: GroupsPageComponent, canActivate: [AuthOnlyGuard] },
            { path: 'groups/my-groups', component: MyGroupsComponent, canActivate: [AuthOnlyGuard] },
            { path: 'play', component: PlayPageComponent, canActivate: [AuthOnlyGuard] },
            { path: 'history', component: HistoryComponent, canActivate: [AuthOnlyGuard] },
            { path: 'group/:groupId', component: GroupViewComponent, canActivate: [AuthOnlyGuard] },
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
            { path: 'login', component: LoginComponent, canActivate: [GuestOnlyGuard] },
            { path: 'register', component: RegisterComponent, canActivate: [GuestOnlyGuard] },
            { path: 'verify-email/:token', component: VerifyEmailComponent, canActivate: [GuestOnlyGuard] },
            { path: 'reset-password/request', component: ResetPasswordRequestComponent, canActivate: [GuestOnlyGuard] },
            { path: 'reset-password/:token', component: ResetPasswordTokenComponent, canActivate: [GuestOnlyGuard] },
            // accessible to authenticated users
            { path: 'create-group', component: GroupNewComponent, canActivate: [AuthOnlyGuard] }, // 'group/new' would break in 'group/:groupId'
            { path: 'group/:groupId/meets/new', component: MeetNewComponent, canActivate: [AuthOnlyGuard] }, // 'meets/new' would break in 'meets/:meetId'
            { path: 'group/:groupId/edit', component: GroupEditComponent, canActivate: [AuthOnlyGuard] },
            { path: 'group/:groupId/leave', component: GroupLeaveComponent, canActivate: [AuthOnlyGuard] },
            { path: 'group/:groupId/delete', component: GroupDeleteComponent, canActivate: [AuthOnlyGuard] },
            { path: 'meets/:meetId/confirm', component: MeetConfirmComponent, canActivate: [AuthOnlyGuard] },
        ],
    },
    { path: '**', component: PageNotFoundComponent }, // Wildcard route for a 404 page
]
