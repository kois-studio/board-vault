import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { LoggerMiddleware } from './common/middlewares/logger.middleware'
// Common
import { AuthModule } from './modules/common/auth/auth.module'
import { CacheModule } from './modules/common/cache/cache.module'
import { DatabaseModule } from './modules/common/database/database.module'
import { EmailModule } from './modules/common/email/email.module'
// Core
import { GamesModule } from './modules/core/games/games.module'
import { GroupMembershipsModule } from './modules/core/group-memberships/group-memberships.module'
import { GroupsModule } from './modules/core/groups/groups.module'
import { InvitationsModule } from './modules/core/invitations/invitations.module'
import { MeetAccountGamesModule } from './modules/core/meet-account-games/meet-account-games.module'
import { MeetAttendeesModule } from './modules/core/meet-attendees/meet-attendees.module'
import { NotificationsModule } from './modules/core/notifications/notifications.module'
import { ReviewsModule } from './modules/core/reviews/reviews.module'
import { UsersModule } from './modules/core/users/users.module'
import { WishlistModule } from './modules/core/wishlist/wishlist.module'
// Features
import { CollectionModule } from './modules/features/collection/collection.module'
import { DashboardModule } from './modules/features/dashboard/dashboard.module'
import { PlayModule } from './modules/features/play/play.module'
import { ProfileModule } from './modules/features/profile/profile.module'
import { MeetsModule } from './modules/meets/meets.module'

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        // Common
        AuthModule,
        CacheModule,
        DatabaseModule,
        EmailModule,
        // Core
        GamesModule,
        GroupMembershipsModule,
        GroupsModule,
        InvitationsModule,
        MeetAccountGamesModule,
        MeetAttendeesModule,
        NotificationsModule,
        ReviewsModule,
        WishlistModule,
        // TODO: pending migration
        MeetsModule,
        UsersModule,
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
