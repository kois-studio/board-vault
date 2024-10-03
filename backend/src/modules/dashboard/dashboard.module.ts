import { Module } from '@nestjs/common'
import { DashboardService } from './dashboard.service'
import { DashboardController } from './dashboard.controller'
import { DatabaseService } from '../database/database.service'

@Module({
    providers: [DashboardService, DatabaseService],
    exports: [DashboardService],
    controllers: [DashboardController],
})
export class DashboardModule {}
