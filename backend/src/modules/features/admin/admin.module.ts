import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module'
import { TagCategoryModule } from '../../core/tag-category/tag-category.module'

import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'

@Module({
    imports: [
        DatabaseModule, // needed for VerifiedUserGuard
        TagCategoryModule,
    ],
    providers: [AdminService],
    exports: [AdminService],
    controllers: [AdminController],
})
export class AdminModule {}
