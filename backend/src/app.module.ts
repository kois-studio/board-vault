import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { LoggerMiddleware } from './common/middlewares/logger.middleware'
import { ConfigModule } from '@nestjs/config'
import { DatabaseModule } from './modules/database/database.module'
import { UsersModule } from './modules/users/users.module'
import { AuthModule } from './modules/auth/auth.module'
import { GroupsModule } from './modules/groups/groups.module'
import { GroupMembershipsModule } from './modules/group-memberships/group-memberships.module'
import { GamesModule } from './modules/games/games.module'
import { GamesOwnedModule } from './modules/games-owned/games-owned.module'
import { InvitationsModule } from './modules/invitations/invitations.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { GameReviewsModule } from './modules/reviews/reviews.module'
import { GamePlaySessionModule } from './modules/game-play-session/game-play-session.module'
import { MeetsModule } from './modules/meets/meets.module'
import { MeetAttendeesModule } from './modules/meet-attendees/meet-attendees.module'
import { MeetGamesModule } from './modules/meet-games/meet-games.module'
import { EmailModule } from './modules/email/email.module'

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
        AuthModule,
        UsersModule,
        GroupsModule,
        GroupMembershipsModule,
        GamesModule,
        GamesOwnedModule,
        InvitationsModule,
        NotificationsModule,
        GameReviewsModule,
        GamePlaySessionModule,
        MeetsModule,
        MeetAttendeesModule,
        MeetGamesModule,
        EmailModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware).forRoutes('*')
    }
}
