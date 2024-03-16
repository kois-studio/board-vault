import { defineDb, defineTable, column, NOW } from 'astro:db'

// Accounts - Authentication
const Account = defineTable({
    columns: {
        id: column.number({ primaryKey: true }),
        email: column.text(),
        password: column.text(),
        created_at: column.date({ default: NOW }),
    },
})

// Each Account will be able to register their friends and family as owners inside their account
const Owner = defineTable({
    columns: {
        id: column.number({ primaryKey: true }),
        accountId: column.number({ references: () => Account.columns.id }),
        name: column.text(),
        imageUrl: column.text(),
    },
})

// Games - Shared index of known games for all users to read
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


// JOIN table to link an owner to a game
const OwnedGame = defineTable({
    columns: {
        ownerId: column.number({ references: () => Owner.columns.id }),
        gameId: column.number({ references: () => Game.columns.id }),
    },
})

// Session - User sessions
const Session = defineTable({
    columns: {
        sessionId: column.text({ primaryKey: true }),
        accountId: column.number({ references: () => Account.columns.id }),
        createdAt: column.date({ default: NOW }),
    },
})

// https://astro.build/db/config
export default defineDb({
    tables: {
        Account,
        Game,
        Owner,
        OwnedGame,
        Session,
    },
})
