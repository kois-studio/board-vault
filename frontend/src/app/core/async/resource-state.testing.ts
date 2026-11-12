import { computed, isSignal, type Signal, signal } from '@angular/core'
import { withShelf } from '../utils/groupShelf'
import { overviewAndShelf, type TestGroup } from '../utils/groupShelf.testing'
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
    withGroupShelves(result)
    for (const [key, value] of Object.entries(fake)) {
        if (!/^user[A-Z]/.test(key) || key.endsWith('State') || typeof value !== 'function' || `${key}State` in fake) continue
        if (!isSignal(value)) continue
        // The groups' shelves follow the groups they are read from.
        const status = statuses[key] ?? (key === 'userGroupsWithShelves' ? statuses['userGroups'] : undefined) ?? 'ready'
        result[`${key}State`] = stateOf(value as Signal<unknown>, status)
    }
    return fake as F & Record<`${string}State`, Signal<ResourceState<unknown>>>
}

/**
 * A fake DataService whose `userGroups` describe each person's games, as specs write them, also answers the
 * groups' shelves (#262): `groupShelf`, `groupWithShelf`, `userGroupsWithShelves`, read from those groups.
 * Anything the spec gives itself is kept.
 */
function withGroupShelves(fake: Record<string, unknown>): void {
    const groups = fake['userGroups']
    if (!isSignal(groups)) return
    const all = computed(() => (groups() as Array<TestGroup>).map((group) => overviewAndShelf(group)))
    const find = (groupId: number) => all().find(({ overview }) => overview.id === groupId)
    const defaults: Record<string, unknown> = {
        groupShelvesRevision: signal(0),
        groupShelf: (groupId: number) => {
            const found = find(groupId)
            return found ? Promise.resolve(found.shelf) : Promise.reject(new Error('Not in this group'))
        },
        groupWithShelf: (groupId: number) => {
            const found = find(groupId)
            return found ? Promise.resolve(withShelf(found.overview, found.shelf)) : Promise.reject(new Error('Not in this group'))
        },
        userGroupsWithShelves: computed(() => all().map(({ overview, shelf }) => withShelf(overview, shelf))),
        loadUserGroupsWithShelves: () => undefined,
    }
    for (const [key, value] of Object.entries(defaults)) if (!(key in fake)) fake[key] = value
}
