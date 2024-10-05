import { Routes } from '@angular/router'

import { LayoutBasicComponent } from './layout/layout-basic/layout-basic.component'
// Layouts
import { LayoutCompleteComponent } from './layout/layout-complete/layout-complete.component'

import { DashboardComponent } from './pages/dashboard/dashboard.component'
import { GamesComponent } from './pages/games/games.component'
// Components
import { LandingComponent } from './pages/landing/landing.component'
import { LoginComponent } from './pages/login/login.component'
import { RegisterComponent } from './pages/register/register.component'

// Guards
import { AuthRedirectGuard } from './core/guards/auth-redirect.guard'
import { AuthGuard } from './core/guards/auth.guard'
import { PageNotFoundComponent } from './pages/page-not-found/page-not-found.component'

export const routes: Routes = [
    {
        path: '',
        component: LayoutCompleteComponent,
        children: [
            // accessible to everyone
            { path: '', component: LandingComponent },
            // accessible to authenticated users
            { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
            { path: 'games', component: GamesComponent, canActivate: [AuthGuard] },
        ],
    },
    {
        path: '',
        component: LayoutBasicComponent,
        children: [
            // accessible to unauthenticated users
            { path: 'login', component: LoginComponent, canActivate: [AuthRedirectGuard] },
            { path: 'register', component: RegisterComponent, canActivate: [AuthRedirectGuard] },
        ],
    },
    { path: '**', component: PageNotFoundComponent }, // Wildcard route for a 404 page
]
