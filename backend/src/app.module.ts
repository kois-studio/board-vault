import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { LoggerMiddleware } from './common/middlewares/logger.middleware'
import { ConfigModule } from '@nestjs/config'
import { DatabaseModule } from './modules/common/database/database.module'
import { CacheModule } from './modules/common/cache/cache.module'
import { UsersModule } from './modules/users/users.module'
import { AuthModule } from './modules/common/auth/auth.module'
import { GroupsModule } from './modules/core/groups/groups.module'
import { GroupMembershipsModule } from './modules/core/group-memberships/group-memberships.module'
import { GamesModule } from './modules/core/games/games.module'
import { GamesOwnedModule } from './modules/core/games-owned/games-owned.module'
import { InvitationsModule } from './modules/invitations/invitations.module'
import { NotificationsModule } from './modules/core/notifications/notifications.module'
import { ReviewsModule } from './modules/core/reviews/reviews.module'
import { MeetsModule } from './modules/meets/meets.module'
import { MeetAttendeesModule } from './modules/core/meet-attendees/meet-attendees.module'
import { MeetAccountGamesModule } from './modules/core/meet-account-games/meet-account-games.module'
import { EmailModule } from './modules/common/email/email.module'
import { WishlistModule } from './modules/core/wishlist/wishlist.module'
// Features
import { CollectionModule } from './modules/features/collection/collection.module'
import { DashboardModule } from './modules/features/dashboard/dashboard.module'
import { PlayModule } from './modules/features/play/play.module'
import { ProfileModule } from './modules/features/profile/profile.module'

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
        ReviewsModule,
        MeetsModule,
        MeetAttendeesModule,
        MeetAccountGamesModule,
        EmailModule,
        WishlistModule,
        // Features
        CollectionModule,
        DashboardModule,
        PlayModule,
        ProfileModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware).forRoutes('*')
    }
}
