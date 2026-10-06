import { BadRequestException, Controller, Get, Param, Res, StreamableFile } from '@nestjs/common'
import { ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger'

import { ARTWORK_FILE } from '../../../common/artwork/artwork.js'

import { ArtworkService } from './artwork.service.js'

import type { Response } from 'express'

/** A year: the address changes whenever the image does. */
const IMMUTABLE = 'public, max-age=31536000, immutable'
/** An older address of a game whose artwork changed: today's image, briefly. */
const STALE = 'public, max-age=300'

/** Public: game artwork shows on public pages and in `<img>` tags, which send no token. */
@ApiTags('artwork')
@Controller('artwork')
export class ArtworkController {
    constructor(private readonly artworkService: ArtworkService) {}

    @Get(':file')
    @ApiOperation({ summary: "A game's artwork, as `<gameId>-<hash>.webp`; cached for a year" })
    @ApiProduces('image/webp')
    @ApiResponse({ status: 200, description: 'The image' })
    @ApiResponse({ status: 400, description: 'Not an artwork file name' })
    @ApiResponse({ status: 404, description: 'The game has no artwork' })
    async getArtwork(@Param('file') file: string, @Res({ passthrough: true }) response: Response): Promise<StreamableFile> {
        const match = ARTWORK_FILE.exec(file)

        if (!match) throw new BadRequestException('Not an artwork file name.')

        const artwork = await this.artworkService.getForServing(Number(match[1]), match[2]!)
        const cacheControl = artwork.current ? IMMUTABLE : STALE

        response.setHeader('Cache-Control', cacheControl)
        // Vercel's CDN keeps a copy too, so most requests never reach the function or the database.
        response.setHeader('CDN-Cache-Control', cacheControl)

        return new StreamableFile(artwork.bytes, { type: artwork.contentType, length: artwork.bytes.length })
    }
}
