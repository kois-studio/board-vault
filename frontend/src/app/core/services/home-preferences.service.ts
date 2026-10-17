import { effect, Injectable, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import type { HomePreferences } from '../../api/api.types'
import { ToastService } from '../../components/toast/toast.service'
import { DataService } from './data.service'

const defaults = (): HomePreferences => ({ pinnedGroupIds: [], groupOrder: 'recent', dismissedRatingGameIds: [] })

/** Personal, server-stored choices; a response from the previous account never reaches the next. */
@Injectable({ providedIn: 'root' })
export class HomePreferencesService {
    private readonly api = inject(Api)
    private readonly data = inject(DataService)
    private readonly toast = inject(ToastService)
    readonly preferences = signal(defaults())
    readonly loading = signal(true)
    readonly error = signal(false)
    readonly saving = signal(false)
    private generation = 0

    constructor() {
        effect((onCleanup) => {
            const account = this.data.currentUser()
            this.generation++
            this.preferences.set(defaults())
            this.saving.set(false)
            this.error.set(false)
            this.loading.set(Boolean(account))
            if (!account) return
            const request = this.api.getHomePreferences().subscribe({
                next: (preferences) => {
                    this.preferences.set(preferences)
                    this.loading.set(false)
                },
                error: () => {
                    this.error.set(true)
                    this.loading.set(false)
                },
            })
            onCleanup(() => request.unsubscribe())
        })
    }

    async reload(): Promise<void> {
        const generation = this.generation
        this.loading.set(true)
        try {
            const preferences = await firstValueFrom(this.api.getHomePreferences())
            if (generation !== this.generation) return
            this.preferences.set(preferences)
            this.error.set(false)
        } catch {
            if (generation === this.generation) this.error.set(true)
        } finally {
            if (generation === this.generation) this.loading.set(false)
        }
    }

    async update(change: Partial<HomePreferences>): Promise<void> {
        if (this.loading() || this.error() || this.saving()) return
        const generation = this.generation
        const previous = this.preferences()
        this.preferences.set({ ...previous, ...change })
        this.saving.set(true)
        try {
            const saved = await firstValueFrom(this.api.saveHomePreferences(this.preferences()))
            if (generation === this.generation) this.preferences.set(saved)
        } catch {
            if (generation === this.generation) {
                this.preferences.set(previous)
                this.toast.error('Could not save your Home preferences. Try again.')
            }
        } finally {
            if (generation === this.generation) this.saving.set(false)
        }
    }

    togglePin(groupId: number): void {
        const pins = this.preferences().pinnedGroupIds
        void this.update({ pinnedGroupIds: pins.includes(groupId) ? pins.filter((id) => id !== groupId) : [...pins, groupId] })
    }

    movePin(groupId: number, direction: -1 | 1): void {
        const pins = [...this.preferences().pinnedGroupIds]
        const position = pins.indexOf(groupId)
        const other = position + direction
        if (position < 0 || other < 0 || other >= pins.length) return
        const value = pins[other]
        if (value === undefined) return
        pins[other] = groupId
        pins[position] = value
        void this.update({ pinnedGroupIds: pins })
    }
}
