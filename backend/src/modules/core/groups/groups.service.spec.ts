import { createClient } from '@libsql/client'
import { NotFoundException } from '@nestjs/common'

import { fakeDatabase } from '../../../../test/fake-database.js'
import { ProviderTimeoutError } from '../../../common/http/provider-timeout.js'

import { GroupsService } from './groups.service.js'

/** The error libsql really throws when a group's creator is not an account (foreign keys on, as in Turso). */
async function realForeignKeyViolation(): Promise<unknown> {
    const client = createClient({ url: ':memory:' })

    try {
        await client.execute('PRAGMA foreign_keys = ON')
        await client.execute('CREATE TABLE Account (id INTEGER PRIMARY KEY)')
        await client.execute(
            'CREATE TABLE UserGroup (id INTEGER PRIMARY KEY, name TEXT NOT NULL, createdBy INTEGER NOT NULL, FOREIGN KEY (createdBy) REFERENCES Account(id))',
        )
        await client.execute({ sql: 'INSERT INTO UserGroup (name, createdBy) VALUES (?, ?)', args: ['Friends', 999] })
    } catch (error) {
        return error
    } finally {
        client.close()
    }
    throw new Error('expected a foreign key violation')
}

describe('GroupsService createGroup', () => {
    const serviceWith = (createGroup: ReturnType<typeof vi.fn>) => new GroupsService(fakeDatabase({ createGroup }))
    const body = { name: 'Friends', createdBy: 7 }

    it('creates the group', async () => {
        const createGroup = vi.fn().mockResolvedValue(undefined)

        await expect(serviceWith(createGroup).createGroup(body)).resolves.toEqual({ success: true })
        expect(createGroup).toHaveBeenCalledWith(body)
    })

    it('answers 404 "User not found" when the creator is not an account', async () => {
        const violation = await realForeignKeyViolation()

        await expect(serviceWith(vi.fn().mockRejectedValue(violation)).createGroup(body)).rejects.toThrow(
            new NotFoundException('User not found'),
        )
    })

    it('also reads a foreign key violation that carries only the base code and message (remote database)', async () => {
        const violation = Object.assign(new Error('SQLITE_CONSTRAINT: FOREIGN KEY constraint failed'), { code: 'SQLITE_CONSTRAINT' })

        await expect(serviceWith(vi.fn().mockRejectedValue(violation)).createGroup(body)).rejects.toBeInstanceOf(NotFoundException)
    })

    it('reads a foreign key violation whose code is the extended one (remote database)', async () => {
        const violation = Object.assign(new Error('constraint failed'), { code: 'SQLITE_CONSTRAINT_FOREIGNKEY' })

        await expect(serviceWith(vi.fn().mockRejectedValue(violation)).createGroup(body)).rejects.toBeInstanceOf(NotFoundException)
    })

    it('rethrows a database timeout so it answers 503, not 404', async () => {
        const service = serviceWith(vi.fn().mockRejectedValue(new ProviderTimeoutError('database')))

        await expect(service.createGroup(body)).rejects.toBeInstanceOf(ProviderTimeoutError)
    })

    it('rethrows any other database error, other constraints included', async () => {
        const busy = new Error('SQLITE_BUSY: database is locked')
        const notNull = Object.assign(new Error('SQLITE_CONSTRAINT: NOT NULL constraint failed: UserGroup.name'), {
            code: 'SQLITE_CONSTRAINT',
            extendedCode: 'SQLITE_CONSTRAINT_NOTNULL',
        })

        await expect(serviceWith(vi.fn().mockRejectedValue(busy)).createGroup(body)).rejects.toBe(busy)
        await expect(serviceWith(vi.fn().mockRejectedValue(notNull)).createGroup(body)).rejects.toBe(notNull)
    })
})
