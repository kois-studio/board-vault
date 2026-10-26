import { Component, DestroyRef, DOCUMENT, inject } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { Meta, Title } from '@angular/platform-browser'
import { NavigationEnd, Router, RouterOutlet } from '@angular/router'
import { filter } from 'rxjs'
import { ToastComponent } from './components/toast/toast.component'
import { InPageLinkDirective } from './components/ui/in-page-link/in-page-link.directive'
import { ThemeService } from './core/services/theme.service'
import { UsageService } from './core/services/usage.service'

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, ToastComponent, InPageLinkDirective],
    templateUrl: './app.component.html',
})
export class AppComponent {
    private readonly router = inject(Router)
    private readonly destroyRef = inject(DestroyRef)
    private readonly document = inject(DOCUMENT)
    private readonly title = inject(Title)
    private readonly meta = inject(Meta)

    constructor() {
        // Created at startup so a System theme follows OS changes on every page.
        inject(ThemeService)
        inject(UsageService).start(this.destroyRef)
        this.updateDocumentMetadata(this.router.url)

        this.router.events
            .pipe(
                filter((event): event is NavigationEnd => event instanceof NavigationEnd),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((event) => {
                this.updateDocumentMetadata(event.urlAfterRedirects)
                // Move focus to the new page on in-app navigation only. On the first load the
                // browser starts at the top, so the skip link stays the first Tab stop.
                if (event.id === 1) return
                setTimeout(() => document.getElementById('main-content')?.focus({ preventScroll: true }))
            })
    }

    private updateDocumentMetadata(url: string): void {
        const path = url.split(/[?#]/)[0] || '/'
        const metadata = this.getPageMetadata(path)
        // Under the language's prefix (`<base href="/es/">`): `/login` is `/es/login`.
        const canonicalUrl = `${this.getPublicSiteOrigin()}${this.getBasePath()}${path.slice(1)}`

        this.title.setTitle(metadata.title)
        this.meta.updateTag({ name: 'description', content: metadata.description })
        this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow, noarchive' })
        this.meta.updateTag({ property: 'og:title', content: metadata.title })
        this.meta.updateTag({ property: 'og:description', content: metadata.description })
        this.meta.updateTag({ property: 'og:url', content: canonicalUrl })
        this.meta.updateTag({ property: 'og:type', content: 'website' })
        this.meta.updateTag({ property: 'og:image', content: `${this.getPublicSiteOrigin()}/icons/icon-512.png` })
        this.meta.updateTag({ name: 'twitter:card', content: 'summary' })
        this.meta.updateTag({ name: 'twitter:title', content: metadata.title })
        this.meta.updateTag({ name: 'twitter:description', content: metadata.description })

        let canonical = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
        if (!canonical) {
            canonical = this.document.createElement('link')
            canonical.rel = 'canonical'
            this.document.head.appendChild(canonical)
        }
        canonical.href = canonicalUrl
    }

    private getBasePath(): string {
        const base = this.document.querySelector('base')?.getAttribute('href') ?? '/'
        return base.endsWith('/') ? base : `${base}/`
    }

    private getPublicSiteOrigin(): string {
        const origin = this.document.location?.origin
        return origin && origin !== 'null' ? origin : 'https://board-vault.com'
    }

    private getPageMetadata(path: string): { title: string; description: string } {
        const page = [
            {
                match: /^\/$/,
                title: $localize`:Browser tab title of the landing page:Board Vault — Game night, remembered`,
                description: $localize`:Search and link preview description of the landing page:A private workspace for recurring board-game groups to decide, play, and remember together.`,
            },
            {
                match: /^\/login$/,
                title: $localize`:Browser tab title of the Sign in page:Sign in — Board Vault`,
                description: $localize`:Search and link preview description of the Sign in page:Securely sign in to your private Board Vault group workspace.`,
            },
            {
                match: /^\/register$/,
                title: $localize`:Browser tab title of the Join by invitation page:Join by invitation — Board Vault`,
                description: $localize`:Search and link preview description of the Join by invitation page:Create your Board Vault account from a group invitation.`,
            },
            {
                match: /^\/dashboard$/,
                title: $localize`:Browser tab title of the Home page:Home — Board Vault`,
                description: $localize`:Search and link preview description of the Home page:See what your group should do next, from one focused workspace.`,
            },
            {
                match: /^\/submissions$/,
                title: $localize`:Browser tab title of the My submissions page:My submissions — Board Vault`,
                description: $localize`:Search and link preview description of the My submissions page:Propose games for the shared catalogue and follow their review.`,
            },
            {
                match: /^\/create-group$/,
                title: $localize`:Browser tab title of the Create a group page:Create a group — Board Vault`,
                description: $localize`:Search and link preview description of the Create a group page:Start a private board-game group and invite the people you play with.`,
            },
            {
                match: /^\/groups(?:\/|$)/,
                title: $localize`:Browser tab title of the Groups page:Groups — Board Vault`,
                description: $localize`:Search and link preview description of the Groups page:Move between your private board-game groups and their shared history.`,
            },
            {
                match: /^\/collection(?:\/|$)/,
                title: $localize`:Browser tab title of the Collection page:Collection — Board Vault`,
                description: $localize`:Search and link preview description of the Collection page:Keep your private shelf, wishlist, reviews, and group game context together.`,
            },
            {
                match: /^\/games\//,
                title: $localize`:Browser tab title of the Game details page:Game details — Board Vault`,
                description: $localize`:Search and link preview description of the Game details page:Review a game in the context of your private collection and group history.`,
            },
            {
                match: /^\/play(?:\/|$)/,
                title: $localize`:Browser tab title of the Play page:Play — Board Vault`,
                description: $localize`:Search and link preview description of the Play page:Choose, plan, and remember the games your group plays together.`,
            },
            {
                match: /^\/sessions\//,
                title: $localize`:Browser tab title of the Session page:Session — Board Vault`,
                description: $localize`:Search and link preview description of the Session page:Review a private group session, attendance, games, and memories.`,
            },
            {
                match: /^\/settings(?:\/|$)/,
                title: $localize`:Browser tab title of the Settings page:Settings — Board Vault`,
                description: $localize`:Search and link preview description of the Settings page:Manage your Board Vault account and security settings.`,
            },
            {
                // Administration stays English (ADR-0024).
                match: /^\/admin(?:\/|$)/,
                title: 'Admin — Board Vault',
                description: 'Operator tools for maintaining the Board Vault workspace.',
            },
        ].find((candidate) => candidate.match.test(path))

        return (
            page ?? {
                title: $localize`:Browser tab title of the page shown for an address that does not exist:Page not found — Board Vault`,
                description: $localize`:Search and link preview description of the page shown for an address that does not exist:That Board Vault page could not be found.`,
            }
        )
    }
}
