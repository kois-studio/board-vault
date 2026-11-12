import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http'
import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core'
import { provideRouter, RouteReuseStrategy, Router } from '@angular/router'
import { routes } from './app.routes'
import { authInterceptor } from './core/interceptors/auth.interceptor'
import { resilienceInterceptor } from './core/interceptors/resilience.interceptor'
import { RemountOnParamChangeStrategy } from './core/routing/remount-on-param-change'
import { afterFirstPagePaint, ClerkService } from './core/services/clerk.service'
import { usageViewInterceptor } from './core/services/usage.service'

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        { provide: RouteReuseStrategy, useClass: RemountOnParamChangeStrategy },
        // resilienceInterceptor first: its time limit covers fetching the token, and its one retry goes through the others again.
        provideHttpClient(withXhr(), withInterceptors([resilienceInterceptor, authInterceptor, usageViewInterceptor])),
        // Clerk is about 500 KB, and public pages don't need it to render: it loads after the first page paints.
        // Guards and API tokens that need it sooner start it themselves (ClerkService.whenLoaded).
        provideAppInitializer(() => {
            inject(ClerkService).initialize(afterFirstPagePaint(inject(Router)))
        }),
    ],
}
