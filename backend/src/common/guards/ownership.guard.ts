import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common'

@Injectable()
export class UserOwnershipGuard implements CanActivate {
    private readonly LOGGER = new Logger(this.constructor.name)

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest()
        const user: undefined | { userId: number } = request.user // This is set by the JwtStrategy validate method.
        const userIdParam = request.params.userId || request.params.accountId

        if (Number(user?.userId) !== Number(userIdParam)) {
            this.LOGGER.error('Access denied. You are not allowed to modify this data', {
                userId: user?.userId,
                userIdParam,
            })
            throw new ForbiddenException('You are not allowed to modify this data')
        }

        return true
    }
}
