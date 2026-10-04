import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http'
import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core'
import { provideRouter } from '@angular/router'
import { routes } from './app.routes'
import { authInterceptor } from './core/interceptors/auth.interceptor'
import { ClerkService } from './core/services/clerk.service'

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        provideHttpClient(withXhr(), withInterceptors([authInterceptor])),
        // Not awaited: Clerk is about 500 KB, and public pages don't need it to render.
        // Guards and API tokens wait for it (ClerkService.whenLoaded).
        provideAppInitializer(() => {
            void inject(ClerkService).initialize()
        }),
    ],
}
