import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { ClerkSessionMiddleware } from './common/middlewares/clerk-session.middleware'
import { LoggerMiddleware } from './common/middlewares/logger.middleware'
// Common
import { AuthModule } from './modules/common/auth/auth.module'
import { CacheModule } from './modules/common/cache/cache.module'
import { DatabaseModule } from './modules/common/database/database.module'
import { EmailModule } from './modules/common/email/email.module'
import { HealthModule } from './modules/common/health/health.module'
// Core
import { CollectionActivityModule } from './modules/core/collection-activity/collection-activity.module'
import { GameProposalModule } from './modules/core/game-proposal/game-proposal.module'
import { GameTagsModule } from './modules/core/game-tags/game-tags.module'
import { GameTranslationModule } from './modules/core/game-translation/game-translation.module'
import { GamesModule } from './modules/core/games/games.module'
import { GamesOwnedModule } from './modules/core/games-owned/games-owned.module'
import { GroupMembershipsModule } from './modules/core/group-memberships/group-memberships.module'
import { GroupPeopleModule } from './modules/core/group-people/group-people.module'
import { GroupsModule } from './modules/core/groups/groups.module'
import { InvitationsModule } from './modules/core/invitations/invitations.module'
import { MeetAccountGamesModule } from './modules/core/meet-account-games/meet-account-games.module'
import { MeetAttendeesModule } from './modules/core/meet-attendees/meet-attendees.module'
import { MeetsModule } from './modules/core/meets/meets.module'
import { NotificationsModule } from './modules/core/notifications/notifications.module'
import { ReviewsModule } from './modules/core/reviews/reviews.module'
import { TagCategoryModule } from './modules/core/tag-category/tag-category.module'
import { TagsModule } from './modules/core/tags/tags.module'
import { UsersModule } from './modules/core/users/users.module'
import { WishlistModule } from './modules/core/wishlist/wishlist.module'
// Features
import { AdminModule } from './modules/features/admin/admin.module'
import { CollectionModule } from './modules/features/collection/collection.module'
import { DashboardModule } from './modules/features/dashboard/dashboard.module'
import { PlayModule } from './modules/features/play/play.module'
import { ProfileModule } from './modules/features/profile/profile.module'
import { SessionsModule } from './modules/features/sessions/sessions.module'

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        // Common
        AuthModule,
        CacheModule,
        DatabaseModule,
        EmailModule,
        HealthModule,
        // Core
        CollectionActivityModule,
        GameProposalModule,
        GameTagsModule,
        GameTranslationModule,
        GamesModule,
        GamesOwnedModule,
        GroupMembershipsModule,
        GroupPeopleModule,
        GroupsModule,
        InvitationsModule,
        MeetAccountGamesModule,
        MeetAttendeesModule,
        MeetsModule,
        NotificationsModule,
        ReviewsModule,
        TagCategoryModule,
        TagsModule,
        UsersModule,
        WishlistModule,
        // Features
        AdminModule,
        CollectionModule,
        DashboardModule,
        PlayModule,
        ProfileModule,
        SessionsModule,
    ],
    controllers: [],
    providers: [ClerkSessionMiddleware],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware, ClerkSessionMiddleware).forRoutes('*')
    }
}
