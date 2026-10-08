import { groupSchema } from './db-group.schema.js'

describe('groupSchema', () => {
    const row = { id: 1, createdBy: 1, createdAt: '2026-10-08 10:00:00' }

    it('reads short group names, which the create form allows', () => {
        expect(groupSchema.safeParse({ ...row, name: 'DnD' }).success).toBe(true)
        expect(groupSchema.safeParse({ ...row, name: 'Us' }).success).toBe(true)
    })

    it('still rejects an empty name', () => {
        expect(groupSchema.safeParse({ ...row, name: '' }).success).toBe(false)
    })
})
