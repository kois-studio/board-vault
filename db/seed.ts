import { db, Account, Owner, Game, OwnedGame } from 'astro:db'

// https://astro.build/db/seed
export default async function seed() {
    await db.insert(Account).values([
        { id: 1, email: 'hi@hi.com', password: '1234' },
        { id: 2, email: 'ho@ho.com', password: '1234' },
    ])

    await db.insert(Owner).values([
        { id: 1, accountId: 1, name: 'John Doe', imageUrl: 'https://fastly.picsum.photos/id/96/200/200.jpg?hmac=OWdGKA_6EKn7IZEMPRZ-F_wvRBZlDHi-n9QCzIKJV_4' },
        { id: 2, accountId: 1, name: 'Jane Doe', imageUrl: 'https://fastly.picsum.photos/id/921/200/200.jpg?hmac=6pwJUhec4NqIAFxrha-8WXGa8yI1pJXKEYCWMSHroSU' },
    ])

    await db.insert(Game).values([
        { id: 1, title: 'Catan', imageUrl: '', gameAvgDuration: 60, minPlayers: 3, maxPlayers: 4 },
        { id: 2, title: 'Pandemic', imageUrl: '', gameAvgDuration: 45, minPlayers: 2, maxPlayers: 4 },
    ])

    await db.insert(OwnedGame).values([
        { ownerId: 1, gameId: 1 },
        { ownerId: 1, gameId: 2 },
    ])
}
