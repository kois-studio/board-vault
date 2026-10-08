import { type Mock, vi } from 'vitest'

import type { ActivityNotifier } from '../src/modules/core/notifications/activity-notifier.service.js'

export type FakeActivityNotifier = ActivityNotifier & {
    sessionPlanned: Mock<ActivityNotifier['sessionPlanned']>
    sessionChanged: Mock<ActivityNotifier['sessionChanged']>
    memberJoined: Mock<ActivityNotifier['memberJoined']>
}

/** An ActivityNotifier that records calls and sends nothing, for unit tests of the services that use it. */
export function fakeActivityNotifier(): FakeActivityNotifier {
    return { sessionPlanned: vi.fn(), sessionChanged: vi.fn(), memberJoined: vi.fn() } as unknown as FakeActivityNotifier
}
