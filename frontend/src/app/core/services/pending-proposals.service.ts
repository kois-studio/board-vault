import { effect, Injectable, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import { DataService } from './data.service'

/** How many game proposals wait for an admin, for the admin links. Only admins should call refresh(). */
@Injectable({ providedIn: 'root' })
export class PendingProposalsService {
    private readonly api = inject(Api)
    private readonly dataService = inject(DataService)

    /** null until loaded, or when it could not be loaded. */
    public readonly count = signal<number | null>(null)

    constructor() {
        // Signing out clears the count, so a non-admin who signs in next never sees it.
        effect(() => {
            if (!this.dataService.currentUser()) this.count.set(null)
        })
    }

    public async refresh(): Promise<void> {
        try {
            const response = await firstValueFrom(this.api.getAdminGameProposals('pending', 1, 1))
            this.count.set(response.pagination.totalItems)
        } catch {
            this.count.set(null)
        }
    }

    public clear(): void {
        this.count.set(null)
    }
}
