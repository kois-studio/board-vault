import { defineDb, defineTable, column, NOW } from 'astro:db'

// User accounts
const Account = defineTable({
    columns: {
        id: column.number({ primaryKey: true }),
        email: column.text(),
        password: column.text(),
        created_at: column.date({ default: NOW }),
        alias: column.text({ unique: true }), // Display name
        imageUrl: column.text(), // Profile picture
    },
})

// User sessions
const Session = defineTable({
    columns: {
        sessionId: column.text({ primaryKey: true }),
        accountId: column.number({ references: () => Account.columns.id }),
        createdAt: column.date({ default: NOW }),
    },
})

// Shared index of known games for all users to read
const Game = defineTable({
    columns: {
        id: column.number({ primaryKey: true }),
        title: column.text({ unique: true }),
        imageUrl: column.text(),
        gameAvgDuration: column.number(),
        minPlayers: column.number(),
        maxPlayers: column.number(),
    },
})

// JOIN table to link an account to a game
const OwnedGame = defineTable({
    columns: {
        accountId: column.number({ references: () => Account.columns.id }),
        gameId: column.number({ references: () => Game.columns.id }),
    },
})

// Accounts can create groups and invite others to join it
const Group = defineTable({
    columns: {
        id: column.number({ primaryKey: true }),
        name: column.text(),
        createdBy: column.number({ references: () => Account.columns.id }),
        createdAt: column.date({ default: NOW }),
    },
})

// JOIN table to link an account to a group
const GroupMembership = defineTable({
    columns: {
        accountId: column.number({ references: () => Account.columns.id }),
        groupId: column.number({ references: () => Group.columns.id }),
        joinedAt: column.date({ default: NOW }),
    },
})

// Invitations to join a group system
const Invitation = defineTable({
    columns: {
        id: column.number({ primaryKey: true }),
        groupId: column.number({ references: () => Group.columns.id }),
        fromAccountId: column.number({ references: () => Account.columns.id }),
        toAccountId: column.number({ references: () => Account.columns.id }),
        status: column.text(), // e.g., 'pending', 'accepted', 'declined'
        sentAt: column.date({ default: NOW }),
    },
})


// https://astro.build/db/config
export default defineDb({
    tables: {
        Account,
        Session,
        Game,
        OwnedGame,
        Group,
        GroupMembership,
        Invitation,
    },
})
