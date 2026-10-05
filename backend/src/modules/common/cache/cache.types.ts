export const CACHE_TTL = {
    minute: 60, // 1 minute - for aggregate views that should stay close to live (admin overview)
    short: 60 * 60, // 1 hour - for data that the user may frequently update (wishlist, reviews, etc)
    medium: 60 * 60 * 6, // 6 hours - for more static data (group member data, etc)
    long: 60 * 60 * 24, // 1 day - for data that is not updated frequently (game translations, etc)
}
