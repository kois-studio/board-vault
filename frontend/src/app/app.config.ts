import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http'
import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core'
import { provideRouter, Router } from '@angular/router'
import { routes } from './app.routes'
import { authInterceptor } from './core/interceptors/auth.interceptor'
import { afterFirstPagePaint, ClerkService } from './core/services/clerk.service'

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        provideHttpClient(withXhr(), withInterceptors([authInterceptor])),
        // Clerk is about 500 KB, and public pages don't need it to render: it loads after the first page paints.
        // Guards and API tokens that need it sooner start it themselves (ClerkService.whenLoaded).
        provideAppInitializer(() => {
            inject(ClerkService).initialize(afterFirstPagePaint(inject(Router)))
        }),
    ],
}
