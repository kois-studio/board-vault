import {
    db,
    Account,
    Game,
    OwnedGame,
    Group,
    GroupMembership,
    Invitation,
} from 'astro:db'

// Hashed password for "1234"
const example_password = '$2a$14$.nywJt3bPWo7f2tpuGOjWu1.rBpJX2kpU94yQoIzcnyzwlAexEsRe'

// https://astro.build/db/seed
export default async function seed() {
    await db.insert(Account).values([
        {
            id: 1,
            email: 'david@test.com',
            password: example_password,
            alias: 'David',
            imageUrl: 'https://media0.giphy.com/media/N8uutOwabFDcmsuPkp/giphy.gif',
        },
        {
            id: 2,
            email: 'marcos@test.com',
            password: example_password,
            alias: 'Marcos',
            imageUrl: 'https://media3.giphy.com/media/9Ai5dIk8xvBm0/200.webp',
        },
        {
            id: 3,
            email: 'alex@test.com',
            password: example_password,
            alias: 'Alex',
            imageUrl: 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbWE1d3FoZDIwOHA3OHowcmVqb2NoZWRrNTN3MHZpZTlicGp3bnUyeSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/WGFdv6kbikBq0/giphy.gif',
        },
        {
            id: 4,
            email: 'bruno@test.com',
            password: example_password,
            alias: 'Bruno',
            imageUrl: 'https://media4.giphy.com/media/zXKA3p9aR3u7u/giphy.gif',
        },
    ])

    await db.insert(Game).values([
        {
            id: 1,
            title: '4 en raya',
            imageUrl:
                'https://th.bing.com/th/id/OIP.iFUaSb7A9zbN8FDMS7iFoAHaFj?rs=1&pid=ImgDetMain',
            gameAvgDuration: 5,
            minPlayers: 2,
            maxPlayers: 2,
        },
        {
            id: 2,
            title: 'Ajedrez',
            imageUrl:
                'https://upload.wikimedia.org/wikipedia/commons/d/d9/Opening_chess_position_from_black_side.jpg',
            gameAvgDuration: 25,
            minPlayers: 2,
            maxPlayers: 2,
        },
        {
            id: 3,
            title: 'Alhambra',
            imageUrl:
                'https://cf.geekdo-images.com/OiqKsYDh7pqeRYKG__kMSw__itemrep/img/7RUFLxeNec7dSbH0d_t77bFj3mo=/fit-in/246x300/filters:strip_icc()/pic4893652.jpg',
            gameAvgDuration: 90,
            minPlayers: 2,
            maxPlayers: 6,
        },
        {
            id: 4,
            title: 'Arre Unicornio',
            imageUrl:
                'https://media.zacatrus.com/catalog/product/cache/f22f70ef8ee260256901b557cf6bf49a/h/u/huelicorne_1_.jpg',
            gameAvgDuration: 30,
            minPlayers: 2,
            maxPlayers: 8,
        },
        {
            id: 5,
            title: 'Aventureros al tren!',
            imageUrl:
                'https://ugi-games.com/wp-content/uploads/2020/10/10380_days_wonder_aventureros_tren_juego_mesa_espanol_nuevo1.jpg',
            gameAvgDuration: 60,
            minPlayers: 2,
            maxPlayers: 5,
        },
        {
            id: 6,
            title: 'Backgammon',
            imageUrl:
                'https://th.bing.com/th/id/R.90c3fd5a43919242e8cd008613530dbe?rik=VxmqiRuHOBrt%2bw&riu=http%3a%2f%2ftechdoorblog.weebly.com%2fuploads%2f1%2f3%2f0%2f1%2f130136186%2f610bozupxml-sl1024-ccccccc_orig.jpg&ehk=oxswxAfqc3XydB9ZAH%2bF%2fdEqP%2fHRJoqNIz934RxPueM%3d&risl=&pid=ImgRaw&r=0',
            gameAvgDuration: 60,
            minPlayers: 2,
            maxPlayers: 2,
        },
        {
            id: 7,
            title: 'Baraja Española',
            imageUrl:
                'https://www.asesmus.com/wp-content/uploads/2022/08/71Y5q39MbfL._AC_SL1309_.jpg',
            gameAvgDuration: 20,
            minPlayers: 2,
            maxPlayers: 8,
        },
        {
            id: 8,
            title: 'Bote salvavidas',
            imageUrl:
                'https://th.bing.com/th/id/OIP.m6LRhkBEYBImep08G2JaDAHaFj?pid=ImgDet&rs=1',
            gameAvgDuration: 60,
            minPlayers: 4,
            maxPlayers: 8,
        },
        {
            id: 9,
            title: 'CATAN',
            imageUrl:
                'https://donmeeple.com/wp-content/uploads/2020/07/catan-juego-cartas-portada-don-meeple.jpg',
            gameAvgDuration: 30,
            minPlayers: 2,
            maxPlayers: 4,
        },
        {
            id: 10,
            title: 'Carcassonne',
            imageUrl:
                'https://th.bing.com/th/id/OIP.Nov0duOiE7Mh5CjeKhbGBgHaE8?w=244&h=180&c=7&r=0&o=5&pid=1.7',
            gameAvgDuration: 120,
            minPlayers: 2,
            maxPlayers: 8,
        },
        {
            id: 11,
            title: 'Cartas contra la humanidad',
            imageUrl: 'https://m.media-amazon.com/images/I/71mRlflrEkS._AC_SL1500_.jpg',
            gameAvgDuration: 60,
            minPlayers: 2,
            maxPlayers: 14,
        },
        {
            id: 12,
            title: 'Casting Shadows',
            imageUrl:
                'https://teeturtle-s3-web.s3.amazonaws.com/accounts/2/uploads/CS_Bundle_Base-and-EXP-Bundle_Site-Comp_1000x1000.png',
            gameAvgDuration: 45,
            minPlayers: 2,
            maxPlayers: 4,
        },
        {
            id: 13,
            title: 'Ciudadelas',
            imageUrl:
                'https://th.bing.com/th/id/R.2a22f47ceab0f39bd123afb59eae194b?rik=OR5wboES7cP97A&pid=ImgRaw&r=0',
            gameAvgDuration: 30,
            minPlayers: 2,
            maxPlayers: 8,
        },
        {
            id: 14,
            title: 'Cluedo',
            imageUrl:
                'https://upload.wikimedia.org/wikipedia/commons/4/4c/Cluedo_Clue_pack_logo.png',
            gameAvgDuration: 60,
            minPlayers: 2,
            maxPlayers: 6,
        },
        {
            id: 15,
            title: 'Cortex',
            imageUrl: 'https://multimedia.dideco.es/img/juego/EAN_3770004936052-5.jpg',
            gameAvgDuration: 15,
            minPlayers: 2,
            maxPlayers: 6,
        },
        {
            id: 16,
            title: 'Código secreto',
            imageUrl:
                'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIchHefcuB00jFgLuIbxIP70VSEwbVg9x0mQ&usqp=CAU',
            gameAvgDuration: 15,
            minPlayers: 2,
            maxPlayers: 14,
        },
        {
            id: 17,
            title: 'DOS',
            imageUrl:
                'https://th.bing.com/th/id/OIP.fTvlrZclGbcjKy8d7nhHZAHaD4?w=311&h=180&c=7&r=0&o=5&pid=1.7',
            gameAvgDuration: 20,
            minPlayers: 2,
            maxPlayers: 12,
        },
        {
            id: 18,
            title: 'Dixit',
            imageUrl: 'https://m.media-amazon.com/images/I/71FMZqq4ZtL.jpg',
            gameAvgDuration: 30,
            minPlayers: 3,
            maxPlayers: 8,
        },
        {
            id: 19,
            title: 'Dobble',
            imageUrl: 'https://www.jeuxdenim.be/images/jeux/Dobble_large01.jpg',
            gameAvgDuration: 15,
            minPlayers: 2,
            maxPlayers: 8,
        },
        {
            id: 20,
            title: 'Dominó',
            imageUrl:
                'https://upload.wikimedia.org/wikipedia/commons/a/ae/Dominospiel.JPG',
            gameAvgDuration: 20,
            minPlayers: 2,
            maxPlayers: 4,
        },
        {
            id: 21,
            title: 'Exploding Kittens',
            imageUrl: 'https://m.media-amazon.com/images/I/612ZTZ0vc9L._AC_SL1024_.jpg',
            gameAvgDuration: 10,
            minPlayers: 2,
            maxPlayers: 10,
        },
        {
            id: 22,
            title: 'Five Alive',
            imageUrl:
                'https://shop.hasbro.com/_next/image?url=https%3A%2F%2Fwww.hasbro.com%2Fcommon%2Fproductimages%2Fes_ES%2FE88849455863402891467E2D8B61DE43%2F65fb64a2039648648ec1d6829b16ddcd30074b38.jpg&w=640&q=75',
            gameAvgDuration: 10,
            minPlayers: 2,
            maxPlayers: 6,
        },
        {
            id: 23,
            title: 'Gamers Quizz',
            imageUrl:
                'https://cdn.grupoelcorteingles.es/SGFM/dctm/MEDIA03/202206/13/00197632123416____3__1200x1200.jpg',
            gameAvgDuration: 60,
            minPlayers: 2,
            maxPlayers: 6,
        },
        {
            id: 24,
            title: 'Happy Little Dinosaurs',
            imageUrl:
                'https://teeturtle-s3-web.s3.amazonaws.com/accounts/2/uploads/HLD-Purchase-Game-1_Boxes_1000x1000-DD.png',
            gameAvgDuration: 30,
            minPlayers: 2,
            maxPlayers: 4,
        },
        {
            id: 25,
            title: 'Here to Slay',
            imageUrl:
                'https://teeturtle-s3-web.s3.amazonaws.com/accounts/2/uploads/HTS-Base-Game-WDx-BNx-Bundle-Site-Asset-Graphic-Purchase-Game-Game-Box_1000x1000-2_v3.png',
            gameAvgDuration: 40,
            minPlayers: 2,
            maxPlayers: 10,
        },
        {
            id: 26,
            title: 'Hundir la flota',
            imageUrl:
                'https://th.bing.com/th/id/R.8b249f3feedccc098af96e1b2c8efbbf?rik=r32aZMn8GJIcvQ&pid=ImgRaw&r=0',
            gameAvgDuration: 20,
            minPlayers: 2,
            maxPlayers: 2,
        },
        {
            id: 27,
            title: 'Joking Hazard',
            imageUrl:
                'https://th.bing.com/th/id/OIP.oNOfxhiKuQ3tE3qn7kK_2QHaEJ?pid=ImgDet&rs=1',
            gameAvgDuration: 40,
            minPlayers: 3,
            maxPlayers: 10,
        },
        {
            id: 28,
            title: 'Jungle Speed',
            imageUrl:
                'https://media.zacatrus.com/catalog/product/cache/f22f70ef8ee260256901b557cf6bf49a/j/u/jungle_speed.jpg',
            gameAvgDuration: 15,
            minPlayers: 3,
            maxPlayers: 8,
        },
        {
            id: 29,
            title: 'Love Letter',
            imageUrl:
                'https://whatsericplaying.files.wordpress.com/2021/01/cards-2-3.jpg?w=1024',
            gameAvgDuration: 15,
            minPlayers: 2,
            maxPlayers: 6,
        },
        {
            id: 30,
            title: 'Monopoly',
            imageUrl:
                'https://m.media-amazon.com/images/I/81qy+MXuxDL._AC_UF894,1000_QL80_.jpg',
            gameAvgDuration: 180,
            minPlayers: 2,
            maxPlayers: 6,
        },
        {
            id: 31,
            title: 'Pocket Madness',
            imageUrl:
                'https://th.bing.com/th/id/OIP.y92E0oJAnKHqqgC-cXAGmgHaEg?pid=ImgDet&rs=1',
            gameAvgDuration: 40,
            minPlayers: 2,
            maxPlayers: 4,
        },
        {
            id: 32,
            title: 'Poker',
            imageUrl:
                'https://th.bing.com/th/id/R.e1efc4c85748fb449fe1ea547f83d6f1?rik=LcF0k3eueLvC%2fA&pid=ImgRaw&r=0',
            gameAvgDuration: 20,
            minPlayers: 2,
            maxPlayers: 14,
        },
        {
            id: 33,
            title: 'Polilla tramposa',
            imageUrl: 'https://m.media-amazon.com/images/I/71meMWbA3HL.jpg',
            gameAvgDuration: 10,
            minPlayers: 3,
            maxPlayers: 5,
        },
        {
            id: 34,
            title: 'Portal de Molthar',
            imageUrl:
                'https://th.bing.com/th/id/OIP.KzmCcD-E_Dnn5URDw_FpZgHaD4?pid=ImgDet&rs=1',
            gameAvgDuration: 30,
            minPlayers: 2,
            maxPlayers: 8,
        },
        {
            id: 35,
            title: 'Rummikub',
            imageUrl:
                'https://th.bing.com/th/id/OIP.33TNzpA-_YQtjBLgJALtRAHaFH?w=250&h=180&c=7&r=0&o=5&pid=1.7',
            gameAvgDuration: 60,
            minPlayers: 2,
            maxPlayers: 8,
        },
        {
            id: 36,
            title: 'Samurai Sword',
            imageUrl:
                'https://m.media-amazon.com/images/I/61vNcwnTvLL._AC_UF894,1000_QL80_.jpg',
            gameAvgDuration: 15,
            minPlayers: 3,
            maxPlayers: 7,
        },
        {
            id: 37,
            title: 'Sushi Go!',
            imageUrl:
                'https://th.bing.com/th/id/R.5943d256d777f0d9ac7be793db79b642?rik=dSfVsxSjJI0MIg&pid=ImgRaw&r=0',
            gameAvgDuration: 30,
            minPlayers: 2,
            maxPlayers: 5,
        },
        {
            id: 38,
            title: 'The Grimwood',
            imageUrl: 'https://img.fruugo.com/product/1/84/849256841_max.jpg',
            gameAvgDuration: 45,
            minPlayers: 2,
            maxPlayers: 6,
        },
        {
            id: 39,
            title: 'The binding of Isaac',
            imageUrl:
                'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR-96fqFqL54I7-2KRSWj-Ww9-8bbg2EyN45w&usqp=CAU',
            gameAvgDuration: 120,
            minPlayers: 2,
            maxPlayers: 6,
        },
        {
            id: 40,
            title: 'Tic Tac K.O.',
            imageUrl:
                'https://12ax7web.s3.amazonaws.com/accounts/1/uploads/TTKO-Landing-Page-01-PurchaseGame_V2.png',
            gameAvgDuration: 30,
            minPlayers: 2,
            maxPlayers: 4,
        },
        {
            id: 41,
            title: 'Time Bomb',
            imageUrl:
                'https://edicionesprimigenio.com/wp-content/uploads/2017/05/pic3554020.jpg',
            gameAvgDuration: 20,
            minPlayers: 4,
            maxPlayers: 8,
        },
        {
            id: 42,
            title: 'Timeline Twist',
            imageUrl:
                'https://cdn.grupoelcorteingles.es/SGFM/dctm/MEDIA03/202305/12/00197631233984____1__1200x1200.jpg?impolicy=Resize&width=1200',
            gameAvgDuration: 20,
            minPlayers: 2,
            maxPlayers: 6,
        },
        {
            id: 43,
            title: 'Tiro al pato',
            imageUrl:
                'https://th.bing.com/th/id/OIP.5OlGiMwBO-_2K6QefJFeegHaHa?pid=ImgDet&rs=1',
            gameAvgDuration: 30,
            minPlayers: 2,
            maxPlayers: 8,
        },
        {
            id: 44,
            title: 'Tribu de sinvergüenzas',
            imageUrl:
                'https://m.media-amazon.com/images/I/91fv4sSnNvL.__AC_SX300_SY300_QL70_ML2_.jpg',
            gameAvgDuration: 60,
            minPlayers: 2,
            maxPlayers: 15,
        },
        {
            id: 45,
            title: 'Tripulación',
            imageUrl:
                'https://www.theboardgamefamily.com/wp-content/uploads/2020/03/Crew_Choices.jpg',
            gameAvgDuration: 7,
            minPlayers: 2,
            maxPlayers: 5,
        },
        {
            id: 46,
            title: 'UNO',
            imageUrl:
                'https://th.bing.com/th/id/OIP.7MMoTxoTY3buZvb7sKZEZAHaEK?w=315&h=180&c=7&r=0&o=5&pid=1.7',
            gameAvgDuration: 20,
            minPlayers: 2,
            maxPlayers: 12,
        },
        {
            id: 47,
            title: 'Unstable Unicorns',
            imageUrl:
                'https://teeturtle-s3-web.s3.amazonaws.com/accounts/2/uploads/UU_PurchaseGames.png',
            gameAvgDuration: 30,
            minPlayers: 2,
            maxPlayers: 8,
        },
        {
            id: 48,
            title: 'Unstable Unicorns Travel Edition',
            imageUrl:
                'https://teeturtle-s3-web.s3.amazonaws.com/accounts/2/products/1986199882677/Front-82-Card-1-1000x1000.jpg',
            gameAvgDuration: 30,
            minPlayers: 2,
            maxPlayers: 4,
        },
        {
            id: 49,
            title: 'Virus',
            imageUrl:
                'https://tranjisgames.com/wp-content/uploads/2019/11/virus1_new-1.png',
            gameAvgDuration: 20,
            minPlayers: 2,
            maxPlayers: 6,
        },
        {
            id: 50,
            title: 'What do you meme',
            imageUrl:
                'https://th.bing.com/th/id/R.74ecd7d85d70a101455790856e58a8a0?rik=%2bPadzQ8bCNvI6g&pid=ImgRaw&r=0',
            gameAvgDuration: 40,
            minPlayers: 3,
            maxPlayers: 20,
        },
    ])

    await db.insert(OwnedGame).values([
        { accountId: 1, gameId: 1 },
        { accountId: 1, gameId: 2 },
        { accountId: 1, gameId: 3 },
        { accountId: 2, gameId: 3 },
        { accountId: 2, gameId: 4 },
        { accountId: 3, gameId: 6 },
        { accountId: 3, gameId: 7 },
        { accountId: 3, gameId: 8 },
        { accountId: 4, gameId: 8 },
        { accountId: 4, gameId: 9 },
    ])

    await db.insert(Group).values([
        { id: 1, name: 'Friends', createdBy: 1 },
        { id: 2, name: 'University', createdBy: 1 },
        { id: 3, name: 'Family', createdBy: 2 },
        { id: 4, name: 'Familia', createdBy: 3 },
        { id: 5, name: 'Santiago', createdBy: 4 },
    ])

    await db.insert(GroupMembership).values([
        { accountId: 1, groupId: 1 },
        { accountId: 2, groupId: 1 },
        { accountId: 1, groupId: 2 },
        { accountId: 2, groupId: 3 },
        { accountId: 3, groupId: 4 },
        { accountId: 4, groupId: 5 },
    ])

    await db.insert(Invitation).values([
        { id: 1, groupId: 1, fromAccountId: 1, toAccountId: 2, status: 'pending' },
        { id: 2, groupId: 1, fromAccountId: 1, toAccountId: 3, status: 'pending' },
        { id: 3, groupId: 1, fromAccountId: 1, toAccountId: 4, status: 'pending' },
        { id: 5, groupId: 2, fromAccountId: 2, toAccountId: 3, status: 'pending' },
        { id: 4, groupId: 4, fromAccountId: 4, toAccountId: 2, status: 'pending' },
    ])
}
