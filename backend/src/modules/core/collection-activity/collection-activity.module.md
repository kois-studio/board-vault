# collection-activity.module.md

The `CollectionActivityModule` is responsible for tracking the operations performed over the user's collection.

This includes 6 different operations:

- Added to collection (`OwnedGame`)
- Removed from collection (`OwnedGame`)
- Updated (`OwnedGame` purchasePrice, purchaseDate, purchaseNotes)
- Rated (`GameReview`)
- Wishlisted (`WishlistedGame`)
- Unwishlisted (`WishlistedGame`)


## Methods

Exposes only 2 methods:

1. Get all the records for a user
2. Log a new activity

## Cache

When logging a new activity, the cache is cleared.

When logging a new activity, if >32 records are present, the oldest record is deleted.
