import { createHmac, randomBytes } from 'node:crypto'

import { BadRequestException, NotFoundException } from '@nestjs/common'

import { ClerkWebhookController } from './clerk-webhook.controller'

import type { RawBodyRequest } from '../../../common/http/http-hardening'

const key = randomBytes(24)
const signingSecret = `whsec_${key.toString('base64')}`

// Signs a payload the way Clerk (Svix / Standard Webhooks) does.
function signedRequest(body: string, options: { secretKey?: Buffer; timestamp?: number } = {}): RawBodyRequest {
    const id = 'msg_test'
    const timestamp = String(options.timestamp ?? Math.floor(Date.now() / 1000))
    const signature = createHmac('sha256', options.secretKey ?? key)
        .update(`${id}.${timestamp}.${body}`)
        .digest('base64')

    return {
        headers: { 'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': `v1,${signature}` },
        rawBody: Buffer.from(body),
    } as unknown as RawBodyRequest
}

describe('ClerkWebhookController', () => {
    const event = { type: 'user.deleted', object: 'event', data: { id: 'user_1', deleted: true, object: 'user' } }
    const body = JSON.stringify(event)

    function createController(secret: string | undefined = signingSecret) {
        const handle = jest.fn().mockResolvedValue(undefined)
        const controller = new ClerkWebhookController({ get: () => secret } as never, { handle } as never)

        return { controller, handle }
    }

    it('handles a delivery signed with the configured secret', async () => {
        const { controller, handle } = createController()

        await controller.receive(signedRequest(body))

        expect(handle).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'user.deleted', data: expect.objectContaining({ id: 'user_1' }) }),
        )
    })

    it('rejects a delivery signed with another secret', async () => {
        const { controller, handle } = createController()

        await expect(controller.receive(signedRequest(body, { secretKey: randomBytes(24) }))).rejects.toBeInstanceOf(BadRequestException)
        expect(handle).not.toHaveBeenCalled()
    })

    it('rejects a body changed after signing', async () => {
        const { controller, handle } = createController()
        const request = signedRequest(body)

        request.rawBody = Buffer.from(body.replace('user_1', 'user_2'))

        await expect(controller.receive(request)).rejects.toBeInstanceOf(BadRequestException)
        expect(handle).not.toHaveBeenCalled()
    })

    it('rejects a replayed delivery outside the timestamp tolerance', async () => {
        const { controller, handle } = createController()
        const anHourAgo = Math.floor(Date.now() / 1000) - 3600

        await expect(controller.receive(signedRequest(body, { timestamp: anHourAgo }))).rejects.toBeInstanceOf(BadRequestException)
        expect(handle).not.toHaveBeenCalled()
    })

    it('rejects an unsigned delivery', async () => {
        const { controller, handle } = createController()

        await expect(controller.receive({ headers: {}, rawBody: Buffer.from(body) } as unknown as RawBodyRequest)).rejects.toBeInstanceOf(
            BadRequestException,
        )
        expect(handle).not.toHaveBeenCalled()
    })

    it('does not exist when no signing secret is configured', async () => {
        const { controller, handle } = createController('')

        await expect(controller.receive(signedRequest(body))).rejects.toBeInstanceOf(NotFoundException)
        expect(handle).not.toHaveBeenCalled()
    })
})
