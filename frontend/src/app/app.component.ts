import { Component, DestroyRef, DOCUMENT, inject } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { Meta, Title } from '@angular/platform-browser'
import { NavigationEnd, Router, RouterOutlet } from '@angular/router'
import { filter } from 'rxjs'
import { ToastComponent } from './components/toast/toast.component'
import { InPageLinkDirective } from './components/ui/in-page-link/in-page-link.directive'

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
        this.updateDocumentMetadata(this.router.url)

        this.router.events
            .pipe(
                filter((event): event is NavigationEnd => event instanceof NavigationEnd),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((event) => {
                this.updateDocumentMetadata(event.urlAfterRedirects)
                setTimeout(() => document.getElementById('main-content')?.focus({ preventScroll: true }))
            })
    }

    private updateDocumentMetadata(url: string): void {
        const path = url.split(/[?#]/)[0] || '/'
        const metadata = this.getPageMetadata(path)
        const canonicalUrl = `${this.getPublicSiteOrigin()}${path === '/' ? '/' : path}`

        this.title.setTitle(metadata.title)
        this.meta.updateTag({ name: 'description', content: metadata.description })
        this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow, noarchive' })
        this.meta.updateTag({ property: 'og:title', content: metadata.title })
        this.meta.updateTag({ property: 'og:description', content: metadata.description })
        this.meta.updateTag({ property: 'og:url', content: canonicalUrl })
        this.meta.updateTag({ property: 'og:type', content: 'website' })
        this.meta.updateTag({ property: 'og:image', content: `${this.getPublicSiteOrigin()}/images/logo.webp` })
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

    private getPublicSiteOrigin(): string {
        const origin = this.document.location?.origin
        return origin && origin !== 'null' ? origin : 'https://board-vault.com'
    }

    private getPageMetadata(path: string): { title: string; description: string } {
        const page = [
            {
                match: /^\/$/,
                title: 'Board Vault — Game night, remembered',
                description: 'A private workspace for recurring board-game groups to decide, play, and remember together.',
            },
            {
                match: /^\/login$/,
                title: 'Sign in — Board Vault',
                description: 'Securely sign in to your private Board Vault group workspace.',
            },
            {
                match: /^\/register$/,
                title: 'Join by invitation — Board Vault',
                description: 'Create your Board Vault account from a group invitation.',
            },
            {
                match: /^\/dashboard$/,
                title: 'Home — Board Vault',
                description: 'See what your group should do next, from one focused workspace.',
            },
            {
                match: /^\/submissions$/,
                title: 'My submissions — Board Vault',
                description: 'Propose games for the shared catalogue and follow their review.',
            },
            {
                match: /^\/create-group$/,
                title: 'Create a group — Board Vault',
                description: 'Start a private board-game group and invite the people you play with.',
            },
            {
                match: /^\/groups(?:\/|$)/,
                title: 'Groups — Board Vault',
                description: 'Move between your private board-game groups and their shared history.',
            },
            {
                match: /^\/collection(?:\/|$)/,
                title: 'Collection — Board Vault',
                description: 'Keep your private shelf, wishlist, reviews, and group game context together.',
            },
            {
                match: /^\/games\//,
                title: 'Game details — Board Vault',
                description: 'Review a game in the context of your private collection and group history.',
            },
            {
                match: /^\/play(?:\/|$)/,
                title: 'Play — Board Vault',
                description: 'Choose, plan, and remember the games your group plays together.',
            },
            {
                match: /^\/sessions\//,
                title: 'Session — Board Vault',
                description: 'Review a private group session, attendance, games, and memories.',
            },
            {
                match: /^\/settings(?:\/|$)/,
                title: 'Settings — Board Vault',
                description: 'Manage your Board Vault account and security settings.',
            },
            {
                match: /^\/admin(?:\/|$)/,
                title: 'Admin — Board Vault',
                description: 'Operator tools for maintaining the Board Vault workspace.',
            },
        ].find((candidate) => candidate.match.test(path))

        return page ?? { title: 'Page not found — Board Vault', description: 'That Board Vault page could not be found.' }
    }
}
