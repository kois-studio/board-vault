import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { LoggerMiddleware } from './common/middlewares/logger.middleware'
import { ConfigModule } from '@nestjs/config'
import { DatabaseModule } from './modules/database/database.module'
import { UsersModule } from './modules/users/users.module'
import { AuthModule } from './modules/auth/auth.module'
import { GroupsModule } from './modules/groups/groups.module'
import { GroupMembershipsModule } from './modules/group-memberships/group-memberships.module'
import { GamesModule } from './modules/games/games.module'
import { DashboardModule } from './modules/dashboard/dashboard.module'

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
        AuthModule,
        DashboardModule,
        UsersModule,
        GroupsModule,
        GroupMembershipsModule,
        GamesModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware).forRoutes('*')
    }
}
