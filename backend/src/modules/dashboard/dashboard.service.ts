import { Injectable, Logger } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'

@Injectable()
export class DashboardService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    async dashboardGetGroupsWithMembers(userId: number) {
        this.LOGGER.log('Getting groups with members')
        const resultSet = await this.databaseService.dashboardGetGroupsWithMembers(userId)

        return resultSet.rows.map(row => ({
            groupId: Number(row[0]),
            groupName: String(row[1]),
            groupCreatedBy: Number(row[2]),
            groupCreatedAt: String(row[3]),
            membershipJoinedAt: String(row[4]),
        }))
    }
}
