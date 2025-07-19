import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { LoggerMiddleware } from './common/middlewares/logger.middleware'
// Common
import { AuthModule } from './modules/common/auth/auth.module'
import { CacheModule } from './modules/common/cache/cache.module'
import { DatabaseModule } from './modules/common/database/database.module'
import { EmailModule } from './modules/common/email/email.module'
// Core
import { CollectionActivityModule } from './modules/core/collection-activity/collection-activity.module'
import { GameProposalModule } from './modules/core/game-proposal/game-proposal.module'
import { GameTagsModule } from './modules/core/game-tags/game-tags.module'
import { GameTranslationModule } from './modules/core/game-translation/game-translation.module'
import { GamesModule } from './modules/core/games/games.module'
import { GamesOwnedModule } from './modules/core/games-owned/games-owned.module'
import { GroupMembershipsModule } from './modules/core/group-memberships/group-memberships.module'
import { GroupsModule } from './modules/core/groups/groups.module'
import { InvitationsModule } from './modules/core/invitations/invitations.module'
import { MeetAccountGamesModule } from './modules/core/meet-account-games/meet-account-games.module'
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

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        // Common
        AuthModule,
        CacheModule,
        DatabaseModule,
        EmailModule,
        // Core
        CollectionActivityModule,
        GameProposalModule,
        GameTagsModule,
        GameTranslationModule,
        GamesModule,
        GamesOwnedModule,
        GroupMembershipsModule,
        GroupsModule,
        InvitationsModule,
        MeetAccountGamesModule,
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
    ],
    controllers: [],
    providers: [],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware).forRoutes('*')
    }
}
