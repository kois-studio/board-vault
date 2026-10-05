import { effect, Injectable, inject, signal, untracked } from '@angular/core'
import { FormControl } from '@angular/forms'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../../../api/api'
import type { AdminGamesFilters, AdminGamesResultType, AdminGameType } from '../../../../api/api.types'
import { DataService } from '../../../../core/services/data.service'
import { LogService } from '../../../../core/services/log.service'

const PAGE_SIZE = 20

/**
 * The admin catalogue list. It lives at the root so the filters survive opening a game and coming back;
 * signing out clears it.
 */
@Injectable({ providedIn: 'root' })
export class AdminGamesManageService {
    private readonly api = inject(Api)
    private readonly logger = inject(LogService)
    private readonly dataService = inject(DataService)

    public readonly gamesList = signal<Array<AdminGameType>>([])
    public readonly pagination = signal<AdminGamesResultType['pagination'] | null>(null)
    public readonly filters = signal<AdminGamesFilters>({})
    public readonly page = signal(1)
    public readonly isLoading = signal(false)
    public readonly errorMessage = signal<string | null>(null)
    public readonly searchControl = new FormControl('', { nonNullable: true })

    private loadVersion = 0

    constructor() {
        // Signing out clears this state, so the next account never sees it.
        effect(() => {
            if (!this.dataService.currentUser()) untracked(() => this.reset())
        })
    }

    public async load(filters: AdminGamesFilters = this.filters(), page = 1): Promise<void> {
        const version = ++this.loadVersion
        this.filters.set(filters)
        this.page.set(page)
        this.isLoading.set(true)
        this.errorMessage.set(null)

        try {
            const result = await firstValueFrom(this.api.getAdminGames(filters, page, PAGE_SIZE))
            // A newer search may have started while this one was in flight.
            if (version !== this.loadVersion) return
            this.gamesList.set(result.games)
            this.pagination.set(result.pagination)
        } catch (error) {
            if (version !== this.loadVersion) return
            this.logger.error('Error loading the catalogue:', error)
            this.errorMessage.set('The catalogue could not be loaded. Try again.')
        } finally {
            if (version === this.loadVersion) this.isLoading.set(false)
        }
    }

    public async update(changes: Partial<AdminGamesFilters>): Promise<void> {
        await this.load({ ...this.filters(), ...changes }, 1)
    }

    public reset(): void {
        this.loadVersion++
        this.gamesList.set([])
        this.pagination.set(null)
        this.filters.set({})
        this.page.set(1)
        this.isLoading.set(false)
        this.errorMessage.set(null)
        this.searchControl.setValue('', { emitEvent: false })
    }
}
