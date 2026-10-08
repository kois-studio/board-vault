import { BadRequestException, Controller, Get, Param, Res } from '@nestjs/common'
import { ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger'

import { ARTWORK_FILE } from '../../../common/artwork/artwork.js'

import { ArtworkService } from './artwork.service.js'

import type { Response } from 'express'

/** A year: the address changes whenever the image does. */
const IMMUTABLE = 'public, max-age=31536000, immutable'
/** An older address of a game whose artwork changed: where today's image is, briefly. */
const MOVED = 'public, max-age=300'

/** Public: game artwork shows on public pages and in `<img>` tags, which send no token. */
@ApiTags('artwork')
@Controller('artwork')
export class ArtworkController {
    constructor(private readonly artworkService: ArtworkService) {}

    @Get(':file')
    @ApiOperation({ summary: "A game's artwork, as `<gameId>-<hash>.webp`; cached for a year" })
    @ApiProduces('image/webp')
    @ApiResponse({ status: 200, description: 'The image' })
    @ApiResponse({ status: 302, description: "Another hash: redirects to the game's current artwork" })
    @ApiResponse({ status: 400, description: 'Not an artwork file name' })
    @ApiResponse({ status: 404, description: 'The game has no artwork' })
    async getArtwork(@Param('file') file: string, @Res() response: Response): Promise<void> {
        const match = ARTWORK_FILE.exec(file)

        if (!match) throw new BadRequestException('Not an artwork file name.')

        const artwork = await this.artworkService.getForServing(Number(match[1]), match[2]!)

        if (artwork.kind === 'moved') {
            // Only the current address reads the image, so made-up hashes cannot skip the CDN to load the database.
            // Relative, so it resolves next to the address that was asked for.
            response.setHeader('Cache-Control', MOVED)
            response.setHeader('CDN-Cache-Control', MOVED)
            response.redirect(302, artwork.path.slice('/artwork/'.length))
            return
        }

        response.setHeader('Cache-Control', IMMUTABLE)
        // Vercel's CDN keeps a copy too, so most requests never reach the function or the database.
        response.setHeader('CDN-Cache-Control', IMMUTABLE)
        response.type(artwork.contentType).setHeader('Content-Length', artwork.bytes.length)
        response.end(artwork.bytes)
    }
}
