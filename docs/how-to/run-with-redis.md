# Run with local Redis

Redis is off by default locally (`UPSTASH_REDIS_REST_DISABLE=true`). The app
works without it; you lose caching, and rate limits allow everything.

To test caching or rate limits, start the optional profile. It needs Docker.

```shell
docker compose --profile redis up -d
```

It runs Redis behind [serverless-redis-http](https://github.com/hiett/serverless-redis-http),
which speaks the Upstash REST protocol the API uses. A plain Redis port does
not work with the API.

Then set in `backend/.env` and restart the API:

```dotenv
UPSTASH_REDIS_REST_DISABLE=false
UPSTASH_REDIS_REST_URL=http://localhost:8079
UPSTASH_REDIS_REST_TOKEN=local-only-board-vault
```

`http://localhost:3000/health/ready` should report `"cache":"up"`.

Stop it with `docker compose --profile redis down`. Nothing is persisted.
