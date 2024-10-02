import { Routes } from '@angular/router'

import { DashboardComponent } from './pages/dashboard/dashboard.component'
// Components
import { LandingComponent } from './pages/landing/landing.component'
import { LoginComponent } from './pages/login/login.component'
import { ProfileComponent } from './pages/profile/profile.component'
import { RegisterComponent } from './pages/register/register.component'

// Guards
import { AuthRedirectGuard } from './core/guards/auth-redirect.guard'
import { AuthGuard } from './core/guards/auth.guard'

export const routes: Routes = [
    // accessible to everyone
    { path: '', component: LandingComponent },
    // accessible to unauthenticated users
    { path: 'login', component: LoginComponent, canActivate: [AuthRedirectGuard] },
    { path: 'register', component: RegisterComponent, canActivate: [AuthRedirectGuard] },
    // accessible to authenticated users
    { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
    { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
]
