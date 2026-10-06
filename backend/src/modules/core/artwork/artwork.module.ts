import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module.js'

import { ArtworkDownloader } from './artwork-downloader.js'
import { ArtworkController } from './artwork.controller.js'
import { ArtworkService } from './artwork.service.js'

@Module({
    imports: [DatabaseModule],
    providers: [ArtworkService, ArtworkDownloader],
    exports: [ArtworkService],
    controllers: [ArtworkController],
})
export class ArtworkModule {}
