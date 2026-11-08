import { SubmissionKey } from './submissionKey'

describe('SubmissionKey (#246)', () => {
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    let made: number
    const build = () => ({ made: ++made })

    beforeEach(() => {
        made = 0
    })

    it('gives a new key and request for every try by default', () => {
        const submission = new SubmissionKey<{ made: number }>()

        const first = submission.prepare({ groupId: 1 }, build)
        const second = submission.prepare({ groupId: 1 }, build)

        expect(first.key).toMatch(UUID)
        expect(second.key).not.toBe(first.key)
        expect(second.request).toEqual({ made: 2 })
    })

    it('resends the kept try, key and request, while the choices are the same', () => {
        const submission = new SubmissionKey<{ made: number }>()

        const first = submission.prepare({ groupId: 1, ids: [3] }, build)
        submission.keep()
        const retry = submission.prepare({ groupId: 1, ids: [3] }, build)

        expect(retry).toEqual(first)
        expect(made).toBe(1)
    })

    it('starts again when the choices changed, and goes back to the kept try if they change back', () => {
        const submission = new SubmissionKey<{ made: number }>()

        const first = submission.prepare({ groupId: 1 }, build)
        submission.keep()
        const changed = submission.prepare({ groupId: 2 }, build)
        const back = submission.prepare({ groupId: 1 }, build)

        expect(changed.key).not.toBe(first.key)
        expect(back).toEqual(first)
    })

    it('forgets the kept try once cleared', () => {
        const submission = new SubmissionKey<{ made: number }>()

        const first = submission.prepare({ groupId: 1 }, build)
        submission.keep()
        submission.clear()

        expect(submission.prepare({ groupId: 1 }, build).key).not.toBe(first.key)
    })
})
