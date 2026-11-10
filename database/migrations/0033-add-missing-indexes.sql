-- The hot queries read these tables by a column no index started with, so
-- SQLite scanned the whole table (#249): the inbox polled every minute
-- (Notification by account, newest first), a group's members and nights
-- (GroupMembership and Meet by group), tag lookups (GameTag by tag), a game's
-- ratings (GameReview by game), your groups on Home (UserGroup by owner),
-- invitations received, and the games you said you would bring. Plain indexes
-- only: no table or data changes. GroupMembership and GameTag hold just their
-- two key columns, so their indexes carry both and answer without the table.
-- Rollback: DROP INDEX MeetGame_broughtByAccount;
--           DROP INDEX Invitation_toAccount;
--           DROP INDEX UserGroup_createdBy;
--           DROP INDEX GameReview_game;
--           DROP INDEX GameTag_tag;
--           DROP INDEX Meet_group_status_date;
--           DROP INDEX GroupMembership_group;
--           DROP INDEX Notification_account_created;

CREATE INDEX Notification_account_created ON Notification(accountId, createdAt DESC, id DESC);
CREATE INDEX GroupMembership_group ON GroupMembership(groupId, accountId);
CREATE INDEX Meet_group_status_date ON Meet(groupId, status, meetDate);
CREATE INDEX GameTag_tag ON GameTag(tagId, gameId);
CREATE INDEX GameReview_game ON GameReview(gameId);
CREATE INDEX UserGroup_createdBy ON UserGroup(createdBy);
CREATE INDEX Invitation_toAccount ON Invitation(toAccountId);
CREATE INDEX MeetGame_broughtByAccount ON MeetGame(broughtByAccountId);
