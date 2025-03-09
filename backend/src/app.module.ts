import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { LoggerMiddleware } from './common/middlewares/logger.middleware'
import { ConfigModule } from '@nestjs/config'
import { DatabaseModule } from './modules/common/database/database.module'
import { CacheModule } from './modules/common/cache/cache.module'
import { UsersModule } from './modules/users/users.module'
import { AuthModule } from './modules/common/auth/auth.module'
import { GroupsModule } from './modules/groups/groups.module'
import { GroupMembershipsModule } from './modules/core/group-memberships/group-memberships.module'
import { GamesModule } from './modules/core/games/games.module'
import { GamesOwnedModule } from './modules/core/games-owned/games-owned.module'
import { InvitationsModule } from './modules/invitations/invitations.module'
import { NotificationsModule } from './modules/core/notifications/notifications.module'
import { GameReviewsModule } from './modules/core/reviews/reviews.module'
import { MeetsModule } from './modules/meets/meets.module'
import { MeetAttendeesModule } from './modules/meet-attendees/meet-attendees.module'
import { MeetAccountGamesModule } from './modules/core/meet-account-games/meet-account-games.module'
import { EmailModule } from './modules/common/email/email.module'
import { WishlistModule } from './modules/core/wishlist/wishlist.module'

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
        CacheModule,
        AuthModule,
        UsersModule,
        GroupsModule,
        GroupMembershipsModule,
        GamesModule,
        GamesOwnedModule,
        InvitationsModule,
        NotificationsModule,
        GameReviewsModule,
        MeetsModule,
        MeetAttendeesModule,
        MeetAccountGamesModule,
        EmailModule,
        WishlistModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware).forRoutes('*')
    }
}
