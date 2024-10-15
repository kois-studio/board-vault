# Database Definition

The main database is a SQLite hosted in turso.tech.

## ChatGPT Prompt

I will describe you the DB structure, so then you confirm me with a "OK" if everything is clear.

I will describe you the DB structure in non SQL format to make it shorter, but keep in mind that the DB is SQLite!

## Tables

```ts
// User accounts - the users of the application
const Account = defineTable({
	columns: {
		id: column.number({ primaryKey: true }),
		email: column.text(),
		password: column.text(),
		created_at: column.date({ default: NOW }),
		username: column.text({ unique: true }),
		display_name: column.text(), // Custom name
		imageUrl: column.text(), // Profile picture
		is_deleted: column.boolean({ default: false }),
	},
})

// BoardGames - shared table of available games in the system
const Game = defineTable({
	columns: {
		id: column.number({ primaryKey: true }),
		title: column.text({ unique: true }),
		imageUrl: column.text(), // Game picture
		gameAvgDuration: column.number(), // In minutes
		minPlayers: column.number(),
		maxPlayers: column.number(),
	},
})

// JOIN Account-Game - to know which games each user owns
const OwnedGame = defineTable({
	columns: {
		accountId: column.number({ references: () => Account.columns.id }),
		gameId: column.number({ references: () => Game.columns.id }),
	},
})

// Groups of Accounts - the users can organize themselves in multiple groups
const UserGroup = defineTable({
	columns: {
		id: column.number({ primaryKey: true }),
		name: column.text(),
		createdBy: column.number({ references: () => Account.columns.id }),
		createdAt: column.date({ default: NOW }),
		is_deleted: column.boolean({ default: false }),
	},
})

// JOIN Account-Group - to know which users are in which groups + when they joined
const GroupMembership = defineTable({
	columns: {
		accountId: column.number({ references: () => Account.columns.id }),
		groupId: column.number({ references: () => Group.columns.id }),
		joinedAt: column.date({ default: NOW }),
	},
})

// Invitation system - to invite users to groups
const Invitation = defineTable({
	columns: {
		id: column.number({ primaryKey: true }),
		groupId: column.number({ references: () => Group.columns.id }),
		fromAccountId: column.number({ references: () => Account.columns.id }),
		toAccountId: column.number({ references: () => Account.columns.id }),
		status: column.text(), // unused right now, but intended to be 'pending', 'accepted', 'rejected', etc.
		sentAt: column.date({ default: NOW }),
	},
})

// Notifications system - to notify users about events
const Notification = defineTable({
    columns: {
        id: column.number({ primaryKey: true }),
        accountId: column.number({ references: () => Account.columns.id }), // The user receiving the notification
        type: column.text(), // e.g., 'expelled', 'member_left', 'invitation', 'new_game_added'
        relatedGroupId: column.number({ references: () => Group.columns.id, nullable: true }), // In case the notification is group-related
        relatedGameId: column.number({ references: () => Game.columns.id, nullable: true }), // In case the notification is game-related
        message: column.text(), // e.g., 'John has invited you to join the group "Board Gamers"'
        createdAt: column.date({ default: NOW }),
        isRead: column.boolean({ default: false }), // if it has been read
    },
})
```
