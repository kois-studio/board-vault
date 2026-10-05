import { verifyWebhook, type WebhookEvent } from '@clerk/backend/webhooks'
import { BadRequestException, Controller, HttpCode, NotFoundException, Post, Req } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ApiExcludeController } from '@nestjs/swagger'

import { ClerkWebhookService } from './clerk-webhook.service.js'

import type { RawBodyRequest } from '../../../common/http/http-hardening.js'

/**
 * Receives Clerk user lifecycle events (ADR-0013). Clerk signs each delivery
 * with Svix; anything without a valid signature is rejected before it is read.
 * Not part of the client API contract, so it is excluded from OpenAPI.
 */
@ApiExcludeController()
@Controller('webhooks')
export class ClerkWebhookController {
    constructor(
        private readonly configService: ConfigService,
        private readonly clerkWebhookService: ClerkWebhookService,
    ) {}

    @Post('clerk')
    @HttpCode(204)
    async receive(@Req() request: RawBodyRequest): Promise<void> {
        const signingSecret = this.configService.get<string>('CLERK_WEBHOOK_SIGNING_SECRET')?.trim()

        // Without a secret the endpoint does not exist.
        if (!signingSecret) throw new NotFoundException()

        let event: WebhookEvent

        try {
            event = await verifyWebhook(
                new Request('https://webhooks.invalid/clerk', {
                    method: 'POST',
                    headers: {
                        'svix-id': String(request.headers['svix-id'] ?? ''),
                        'svix-timestamp': String(request.headers['svix-timestamp'] ?? ''),
                        'svix-signature': String(request.headers['svix-signature'] ?? ''),
                    },
                    body: request.rawBody?.toString('utf8') ?? '',
                }),
                { signingSecret },
            )
        } catch {
            throw new BadRequestException('Invalid webhook signature')
        }

        await this.clerkWebhookService.handle(event)
    }
}
