import { db, Account, Owner, Game, OwnedGame } from 'astro:db'

// Hashed password for "1234"
const example_password = '$2a$14$.nywJt3bPWo7f2tpuGOjWu1.rBpJX2kpU94yQoIzcnyzwlAexEsRe'

// https://astro.build/db/seed
export default async function seed() {
    await db.insert(Account).values([
        { id: 1, email: 'hi@hi.com', password: example_password },
        { id: 2, email: 'ho@ho.com', password: example_password },
    ])

    await db.insert(Owner).values([
        {
            id: 1,
            userId: 1,
            name: 'Marcos',
            imageUrl: 'https://media3.giphy.com/media/9Ai5dIk8xvBm0/200.webp',
        },
        {
            id: 2,
            userId: 1,
            name: 'David',
            imageUrl: 'https://media0.giphy.com/media/N8uutOwabFDcmsuPkp/giphy.gif',
        },
    ])

    await db.insert(Game).values([
        {
            id: 1,
            title: 'Catan cartas',
            imageUrl: 'https://donmeeple.com/wp-content/uploads/2020/07/catan-juego-cartas-portada-don-meeple.jpg',
            gameAvgDuration: 45,
            minPlayers: 2,
            maxPlayers: 6,
        },
        {
            id: 2,
            title: 'Casting Shadows',
            imageUrl: 'https://teeturtle-s3-web.s3.amazonaws.com/accounts/2/uploads/CS_Bundle_Base-and-EXP-Bundle_Site-Comp_1000x1000.png',
            gameAvgDuration: 45,
            minPlayers: 2,
            maxPlayers: 4,
        },
        {
            id: 3,
            title: 'Backgammon',
            imageUrl:
                'https://th.bing.com/th/id/R.90c3fd5a43919242e8cd008613530dbe?rik=VxmqiRuHOBrt%2bw&riu=http%3a%2f%2ftechdoorblog.weebly.com%2fuploads%2f1%2f3%2f0%2f1%2f130136186%2f610bozupxml-sl1024-ccccccc_orig.jpg&ehk=oxswxAfqc3XydB9ZAH%2bF%2fdEqP%2fHRJoqNIz934RxPueM%3d&risl=&pid=ImgRaw&r=0',
            gameAvgDuration: 60,
            minPlayers: 2,
            maxPlayers: 2,
        },
        {
            id: 4,
            title: 'Ciudadelas',
            imageUrl:
                'https://th.bing.com/th/id/R.2a22f47ceab0f39bd123afb59eae194b?rik=OR5wboES7cP97A&pid=ImgRaw&r=0',
            gameAvgDuration: 30,
            minPlayers: 2,
            maxPlayers: 8,
        }
    ])

    await db.insert(OwnedGame).values([
        { ownerId: 1, gameId: 1 },
        { ownerId: 1, gameId: 2 },
        { ownerId: 1, gameId: 3 },
        { ownerId: 2, gameId: 3 },
        { ownerId: 2, gameId: 4 },
    ])
}
