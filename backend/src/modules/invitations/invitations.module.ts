import { Module } from '@nestjs/common'
import { InvitationsService } from './invitations.service'
import { InvitationsController } from './invitations.controller'
import { DatabaseService } from '../database/database.service'

@Module({
    providers: [InvitationsService, DatabaseService],
    exports: [InvitationsService],
    controllers: [InvitationsController],
})
export class InvitationsModule {}
