import { userSchema } from './db-user.schema.js'

describe('userSchema', () => {
    it('reads a display name shorter than 4 characters (#125)', () => {
        const row = userSchema.shape
        expect(row.displayName.safeParse('Ana').success).toBe(true)
        expect(row.displayName.safeParse('Jo').success).toBe(true)
        expect(row.displayName.safeParse('').success).toBe(false)
    })
})
