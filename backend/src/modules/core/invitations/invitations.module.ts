import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module'

import { InvitationsController } from './invitations.controller'
import { InvitationsService } from './invitations.service'
// module dependencies

@Module({
    imports: [DatabaseModule],
    providers: [InvitationsService],
    exports: [InvitationsService],
    controllers: [InvitationsController],
})
export class InvitationsModule {}
