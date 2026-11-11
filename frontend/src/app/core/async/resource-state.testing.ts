import { computed, isSignal, type Signal } from '@angular/core'
import { loadingState, type ResourceState, type ResourceStatus, readyState } from './resource-state'

/**
 * For a fake DataService in a spec: the state of a value signal, `ready` unless `status` says otherwise.
 * `status` may be a signal, so a spec can make it load or fail later.
 *
 * `userGames: games, userGamesState: stateOf(games)` or `stateOf(groups, groupsStatus)`.
 */
export function stateOf<T>(value: Signal<T>, status: ResourceStatus | Signal<ResourceStatus> = 'ready'): Signal<ResourceState<T>> {
    return computed(() => {
        const current = typeof status === 'string' ? status : status()
        switch (current) {
            case 'loading':
                return loadingState<T>()
            case 'refreshing':
                return { status: 'refreshing', value: value() }
            case 'error':
                return { status: 'error', value: undefined, error: new Error('Load failed') }
            case 'ready':
                return readyState(value())
        }
    })
}

/**
 * For a fake DataService in a spec: adds `userXState` for every `userX` signal that has none,
 * `ready` unless `statuses` names it (`{ userGroups: 'error' }`, or a signal of the status).
 */
export function withStates<F extends object>(
    fake: F,
    statuses: Record<string, ResourceStatus | Signal<ResourceStatus>> = {},
): F & Record<`${string}State`, Signal<ResourceState<unknown>>> {
    const result = fake as Record<string, unknown>
    for (const [key, value] of Object.entries(fake)) {
        if (!/^user[A-Z]/.test(key) || key.endsWith('State') || typeof value !== 'function' || `${key}State` in fake) continue
        if (!isSignal(value)) continue
        result[`${key}State`] = stateOf(value as Signal<unknown>, statuses[key] ?? 'ready')
    }
    return fake as F & Record<`${string}State`, Signal<ResourceState<unknown>>>
}
