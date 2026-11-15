# Tag untagged games

Proposals are approved without tags: the review page keeps **Tags** folded
and empty (#327). Every so often the owner asks an agent to tag the games
that still have none, in one pass. This page is that pass.

Tags only come from the existing list. A new tag or category is the owner's
call: ask first, then add it under **Admin → Tags**, not with SQL.

## 1. List what needs tags

On production (`turso db shell board-vault`), the games without a tag, and
the tags there are:

```sql
SELECT g.id, e.title, e.languageCode, g.minPlayers, g.maxPlayers, g.gameAvgDuration
FROM Game g
JOIN GameEdition e ON e.gameId = g.id AND e.isPrimary = 1
WHERE NOT EXISTS (SELECT 1 FROM GameTag gt WHERE gt.gameId = g.id)
ORDER BY g.id;

SELECT c.name AS category, t.id, t.name
FROM Tag t JOIN TagCategory c ON c.id = t.categoryId
ORDER BY c.name, t.name;
```

## 2. Propose, then wait for an OK

Show the owner one row per game: the title, the tag names you would set,
and a few words on why when it isn't obvious. Look at how similar games in
the catalogue are tagged, so the same kind of game gets the same tags. Write
nothing until the owner says yes; they may edit the list.

## 3. Write the tags

One transaction with every approved row. `INSERT OR IGNORE`, so a tag an
admin added meanwhile is kept and not duplicated:

```sql
BEGIN;
INSERT OR IGNORE INTO GameTag (gameId, tagId) VALUES
    (41, 3),
    (41, 7),
    (42, 3);
COMMIT;
```

Then rerun the first query from step 1: the games you tagged are gone from it.

## 4. Nothing to clear

Tags are never cached in Redis. The game page, Browse and Administration read
them from the database on every request (#300), so new tags show at once. The
one exception is the tag list in Browse's filters, which a browser may keep for
up to five minutes and then show once more while it refreshes it in the
background (`RarelyChangingInterceptor`, #254). A tag used for the first time
can take that long to appear there.

## 5. Check

Open one tagged game in the app and filter Browse by one of its tags.
