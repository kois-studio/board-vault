import { verifyToken } from '@clerk/backend'
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

type ClerkRequestUser = {
    clerkUserId: string
}

@Injectable()
export class ClerkAuthGuard implements CanActivate {
    constructor(private readonly configService: ConfigService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: ClerkRequestUser }>()
        const token = this.extractBearerToken(request.headers.authorization)
        const secretKey = this.configService.get<string>('CLERK_SECRET_KEY')

        if (!token || !secretKey) {
            throw new UnauthorizedException('A valid Clerk session is required')
        }

        const authorizedParties = this.configService
            .get<string>('CLERK_AUTHORIZED_PARTIES')
            ?.split(',')
            .map(value => value.trim())
            .filter(Boolean)

        let verification: Awaited<ReturnType<typeof verifyToken>>

        try {
            verification = await verifyToken(token, {
                secretKey,
                ...(authorizedParties?.length ? { authorizedParties } : {}),
            })
        } catch {
            throw new UnauthorizedException('The Clerk session could not be verified')
        }

        if (verification.errors || !verification.data.sub) {
            throw new UnauthorizedException('The Clerk session is invalid or expired')
        }

        request.user = {
            clerkUserId: verification.data.sub,
        }

        return true
    }

    private extractBearerToken(authorization?: string): string | null {
        if (!authorization?.startsWith('Bearer ')) {
            return null
        }

        const token = authorization.slice('Bearer '.length).trim()

        return token || null
    }
}
