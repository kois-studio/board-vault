import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'

@Injectable()
export class AdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest()
        const user = request.user // This is set by the JwtStrategy validate method.

        if (!user || !user.isAdmin) {
            throw new ForbiddenException('Access denied. Admins only')
        }

        return true
    }
}
