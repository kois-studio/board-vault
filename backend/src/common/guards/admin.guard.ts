import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common'

@Injectable()
export class AdminGuard implements CanActivate {
    private readonly LOGGER = new Logger(this.constructor.name)

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest()
        const user = request.user // This is set by the JwtStrategy validate method.

        if (!user || !user.isAdmin) {
            this.LOGGER.error('Access denied. Admins only')
            throw new ForbiddenException('Access denied. Admins only')
        }

        return true
    }
}
