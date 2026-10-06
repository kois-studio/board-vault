# ADR: Own game artwork

- **Status:** Accepted
- **Date:** 2026-10-06
- **Supersedes:** None
- **Superseded by:** None

## Context

Each game had one `imageUrl`: an address on someone else's server, usually
found through an image search. Some addresses were search-engine thumbnail
caches, some were shops and blogs, and several had already stopped working.
Every page with game art depended on those servers staying up and allowing
hotlinks, and nothing recorded where an image came from.

ADR-0014 keeps game data in our own tables. Artwork is part of that data. Box
art is the publisher's copyrighted work wherever the copy comes from, so the
source of each image matters as much as where it is stored. Board Vault
also stays on free tiers until traffic justifies otherwise.

## Decision

Board Vault keeps its own copy of every game's artwork and never loads
artwork from a third party at runtime.

- **Copy once.** When an admin approves a proposal or edits a game with an
  image address, the backend downloads it (public http(s) addresses only,
  every redirect checked, 8 MB and 10 seconds at most), turns it upright,
  fits it within 800 pixels, and stores it as WebP without metadata. Admins
  can also upload a file, such as their own photo of the box.
- **Where it lives, for now.** In Turso: the `GameArtwork` table, one row
  per game. The catalogue is small (about 70 games, around 3 MB), well
  inside the free plan.
- **How it is served.** `GET /artwork/<gameId>-<hash>.webp`, public. The hash
  changes with the image, so the response is cached for a year by browsers
  and Vercel's CDN, and most requests never reach the function or the
  database. `Game.imageUrl` holds that path; the frontend resolves it against
  the API address.
- **Where it moves.** Cloudflare R2 (#97) once the domain's DNS is on
  Cloudflare: object storage with no egress fees on the free plan. Only the
  storage behind the same path changes.
- **Sourcing.** Prefer the publisher's own images (product page or press kit),
  then a shop's product photo of the box, then our own photo. Never an
  AI-generated recreation: it is still derived from the publisher's art and
  misrepresents the product. Never a BoardGameGeek upload: its images belong
  to their uploaders and its API terms forbid commercial use without a
  licence. Each stored image keeps the address it was copied from.
- **Takedown.** A rights holder who objects gets the image removed promptly.
  The contact for that is part of the support content due before public
  launch.

## Consequences

- Pages no longer break when another site moves or blocks an image, and
  every image is the same compressed format and size.
- Artwork bytes live in the database until #97: they grow backups and the
  development copy, and a cache miss costs one function call and one row
  read.
- An address an admin enters can fail (a dead link, a page instead of an
  image, a site that refuses downloads). The admin sees why and can choose
  another address, upload a file, or leave the game without artwork.
- The development database refresh copies the catalogue; it must copy
  `GameArtwork` with it, or development games show the placeholder.

## Alternatives considered

- **Keep hotlinking:** free, but breaks without notice and records no source.
- **Files in `frontend/public/`:** free and fast, but every new game needs a
  commit and a deploy.
- **Vercel Blob:** no DNS change, but a new service with a tighter free plan,
  thrown away when R2 arrives.
- **BoardGameGeek images through its API:** a runtime dependency on another
  service, user-uploaded images, and non-commercial terms (ADR-0014).
- **AI-generated images in a house style:** still derived from the
  publisher's art, and unwelcome in the board-game community.
