import { HttpException, type HttpStatus } from '@nestjs/common'

export const API_ERROR_CODES = {
    CLERK_INTEGRATION_MISCONFIGURED: 'CLERK_INTEGRATION_MISCONFIGURED',
    CLERK_INVITATION_LINK_UNAVAILABLE: 'CLERK_INVITATION_LINK_UNAVAILABLE',
    CLERK_INVITATION_REDIRECT_MISCONFIGURED: 'CLERK_INVITATION_REDIRECT_MISCONFIGURED',
    CLERK_PROVIDER_UNAVAILABLE: 'CLERK_PROVIDER_UNAVAILABLE',
    PRIVATE_BETA_REGISTRATION_CLOSED: 'PRIVATE_BETA_REGISTRATION_CLOSED',
} as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES]

export class BoardVaultHttpException extends HttpException {
    constructor(code: ApiErrorCode, status: HttpStatus, message: string) {
        super({ code, message }, status)
    }
}
