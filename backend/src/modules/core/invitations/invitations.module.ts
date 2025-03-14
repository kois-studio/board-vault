import { Module } from '@nestjs/common'
import { InvitationsService } from './invitations.service'
import { InvitationsController } from './invitations.controller'
// module dependencies
import { DatabaseModule } from '../../common/database/database.module'

@Module({
    imports: [DatabaseModule],
    providers: [InvitationsService],
    exports: [InvitationsService],
    controllers: [InvitationsController],
})
export class InvitationsModule {}
