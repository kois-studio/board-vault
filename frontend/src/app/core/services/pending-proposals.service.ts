import { Injectable, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'

/** How many game proposals wait for an admin, for the admin links. Only admins should call refresh(). */
@Injectable({ providedIn: 'root' })
export class PendingProposalsService {
    private readonly api = inject(Api)

    /** null until loaded, or when it could not be loaded. */
    public readonly count = signal<number | null>(null)

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
