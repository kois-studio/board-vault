import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { DatabaseService } from '../../modules/database/database.service'

@Injectable()
export class VerifiedUserGuard implements CanActivate {
    constructor(private readonly databaseService: DatabaseService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest()
        const user = request.user // This is set by the JwtStrategy validate method.

        if (!user) {
            return false // Or throw an UnauthorizedException if you prefer
        }

        const userId = user.userId

        const userRecord = await this.databaseService.getUserById(userId) // Fetch the user from the database
        if (userRecord.rows.length === 0) {
            return false // Or throw an exception
        }

        if (!userRecord.rows[0].email_verified) {
            throw new ForbiddenException('Your email address has not been verified.')
        }

        return true
    }
}
