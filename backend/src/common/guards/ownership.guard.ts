import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'

@Injectable()
export class UserOwnershipGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest()
        const user = request.user // This is set by the JwtStrategy validate method.
        const userIdParam = request.params.id // Assuming the user's ID is passed as a route parameter.

        if (user.userId !== userIdParam) {
            throw new ForbiddenException('You are not allowed to modify this data')
        }

        return true
    }
}
