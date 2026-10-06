import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { ClerkSessionMiddleware } from './common/middlewares/clerk-session.middleware.js'
import { LoggerMiddleware } from './common/middlewares/logger.middleware.js'
// Common
import { AuthModule } from './modules/common/auth/auth.module.js'
import { CacheModule } from './modules/common/cache/cache.module.js'
import { DatabaseModule } from './modules/common/database/database.module.js'
import { HealthModule } from './modules/common/health/health.module.js'
// Core
import { ArtworkModule } from './modules/core/artwork/artwork.module.js'
import { CollectionActivityModule } from './modules/core/collection-activity/collection-activity.module.js'
import { GameProposalModule } from './modules/core/game-proposal/game-proposal.module.js'
import { GameTagsModule } from './modules/core/game-tags/game-tags.module.js'
import { GameTranslationModule } from './modules/core/game-translation/game-translation.module.js'
import { GamesModule } from './modules/core/games/games.module.js'
import { GamesOwnedModule } from './modules/core/games-owned/games-owned.module.js'
import { GroupMembershipsModule } from './modules/core/group-memberships/group-memberships.module.js'
import { GroupPeopleModule } from './modules/core/group-people/group-people.module.js'
import { GroupsModule } from './modules/core/groups/groups.module.js'
import { InvitationsModule } from './modules/core/invitations/invitations.module.js'
import { MeetAccountGamesModule } from './modules/core/meet-account-games/meet-account-games.module.js'
import { MeetAttendeesModule } from './modules/core/meet-attendees/meet-attendees.module.js'
import { MeetsModule } from './modules/core/meets/meets.module.js'
import { NotificationsModule } from './modules/core/notifications/notifications.module.js'
import { ReviewsModule } from './modules/core/reviews/reviews.module.js'
import { TagCategoryModule } from './modules/core/tag-category/tag-category.module.js'
import { TagsModule } from './modules/core/tags/tags.module.js'
import { UsersModule } from './modules/core/users/users.module.js'
import { WishlistModule } from './modules/core/wishlist/wishlist.module.js'
// Features
import { AdminModule } from './modules/features/admin/admin.module.js'
import { CollectionModule } from './modules/features/collection/collection.module.js'
import { DashboardModule } from './modules/features/dashboard/dashboard.module.js'
import { PlayModule } from './modules/features/play/play.module.js'
import { ProfileModule } from './modules/features/profile/profile.module.js'
import { SessionsModule } from './modules/features/sessions/sessions.module.js'

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        // Common
        AuthModule,
        CacheModule,
        DatabaseModule,
        HealthModule,
        // Core
        ArtworkModule,
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
