# cache.module.md

The CacheModule exposes the methods to interact with the redis database.

It will return a `Option<T>` type:

- `Some(value)` if the operation was successful
- `None` if the operation failed
