import { Injectable } from '@nestjs/common'

import { downloadArtwork } from '../../../common/artwork/artwork.js'

/** Fetches artwork from the web. A provider of its own so tests can answer without the network. */
@Injectable()
export class ArtworkDownloader {
    download(address: string): Promise<Buffer> {
        return downloadArtwork(address)
    }
}
