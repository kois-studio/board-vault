# Database Management

Here are the docs to manage the DB from Turso CLI:

https://docs.turso.tech/cli/db/shell

## CREATE DUMP

To make a dump run:

```shell
turso db list # to see the <database-name> 
turso db shell <database-name> .dump > dump.sql
```

## EMPTY DB

To delete all tables in the DB (in case of a Table change for example) run:

```shell
turso db shell <database-name> "SELECT 'DROP TABLE ' || name || ';' FROM sqlite_master WHERE type = 'table';" > drop_tables.sql
turso db shell <database-name> < drop_tables.sql
```

## RESTORE DUMP

Create a brand new DB in Turso or delete the tables from a existing one.
Then import the `dump.sql` file:

```shell
turso db shell <database-name> < dump.sql
```    

## DUMP EXAMPLE (for development)

Copy this inside the `dump.sql` file and import it.

```sql
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

-- -----------------------------------------------------
-- Table 'Account'
-- -----------------------------------------------------
DELETE FROM sqlite_sequence;

CREATE TABLE IF NOT EXISTS Account (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE, 
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    imageUrl TEXT, -- Profile picture, can be NULL initially
    displayName VARCHAR(255), -- Custom name, can be NULL initially
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- auto set to current time
    isDeleted BOOLEAN DEFAULT FALSE, -- soft delete
    isAdmin BOOLEAN DEFAULT FALSE -- indicates if the account is an admin
);
INSERT INTO Account VALUES(1,'david@gmail.com','dawichi','$2b$10$CpIDmTErYFytqH2DWripr.xN60wARDTHwkvpPUmQUJxe1iHIvEYeu','https://pbs.twimg.com/profile_images/1332020756033712130/ZXD9wpQR_400x400.jpg','David M. Fajardo','2024-10-04 13:08:19',0,1);
INSERT INTO Account VALUES(2,'alex@gmail.com','alexwwe','$2b$10$CpIDmTErYFytqH2DWripr.xN60wARDTHwkvpPUmQUJxe1iHIvEYeu','https://pbs.twimg.com/profile_images/991696745418711040/17X66VeI_400x400.jpg','alexwwe','2024-10-03 10:32:18',0,1);
INSERT INTO Account VALUES(3,'test@test.com','test','$2b$10$aO6PuKn0.VDQ.PkAXpw9Sen1DH7T/wtmkeAhv7iy/NGA.JsmC7bT.','https://pbs.twimg.com/profile_images/1833050358479826944/A2qj0e6Z_400x400.jpg','test 1','2024-10-03 09:57:58',0,1);
INSERT INTO Account VALUES(4,'carmenduranveloso@gmail.com','carmen','$2b$10$kjqvaykdY64N2hWyaJOT9.JhVhm696sLeh10Du5Y3culrO09S.IlC','https://th.bing.com/th?id=OIP.Iv1IH-nIdyY3-144t-LxrgHaE7&w=200&h=132&rs=1&qlt=80&o=6&pid=3.1','carmen','2025-02-06 19:09:13',0,0);
INSERT INTO Account VALUES(5,'bruno@gmail.com','bruno','$2b$10$YSrq1xxXlaCyco0H4FUK.uh/OQj0/FlClCcNzloqBXnNhVjrnmIpO','https://cdn.discordapp.com/avatars/316950810951024641/cfe69a5de3bff79279862839a2e2c036.webp','bruno','2025-02-06 19:15:54',0,0);
INSERT INTO Account VALUES(6,'cristian@gmail.com','bloddsword','$2b$10$YSrq1xxXlaCyco0H4FUK.uh/OQj0/FlClCcNzloqBXnNhVjrnmIpO','https://pbs.twimg.com/profile_images/1833050358479826944/A2qj0e6Z_400x400.jpg','bloddsword','2025-02-06 19:16:41',0,0);
INSERT INTO Account VALUES(7,'mirian@gmail.com','mirianbeta','$2b$10$pWLbhMYpv2W5zz6HF2vRquatoxpTKaNbBvm1ttTAcISCCl91/AirW','https://comunidad.retorn.com/wp-content/uploads/2018/09/gatitos.jpg','mirianbeta','2025-02-07 12:55:08',0,0);

-- -----------------------------------------------------
-- Table 'Game'
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Game (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT UNIQUE NOT NULL,
    imageUrl TEXT NOT NULL,
    gameAvgDuration INTEGER,
    minPlayers INTEGER,
    maxPlayers INTEGER
);
INSERT INTO Game VALUES(1,'4 en raya','https://th.bing.com/th/id/OIP.iFUaSb7A9zbN8FDMS7iFoAHaFj?rs=1&pid=ImgDetMain',5,2,2);
INSERT INTO Game VALUES(2,'Arre Unicornio','https://media.zacatrus.com/catalog/product/cache/f22f70ef8ee260256901b557cf6bf49a/h/u/huelicorne_1_.jpg',30,2,8);
INSERT INTO Game VALUES(3,'Backgammon','https://th.bing.com/th/id/R.90c3fd5a43919242e8cd008613530dbe?rik=VxmqiRuHOBrt%2bw&riu=http%3a%2f%2ftechdoorblog.weebly.com%2fuploads%2f1%2f3%2f0%2f1%2f130136186%2f610bozupxml-sl1024-ccccccc_orig.jpg&ehk=oxswxAfqc3XydB9ZAH%2bF%2fdEqP%2fHRJoqNIz934RxPueM%3d&risl=&pid=ImgRaw&r=0',60,2,2);
INSERT INTO Game VALUES(4,'Baraja Española','https://www.asesmus.com/wp-content/uploads/2022/08/71Y5q39MbfL._AC_SL1309_.jpg',20,2,8);
INSERT INTO Game VALUES(5,'Bote salvavidas','https://th.bing.com/th/id/OIP.m6LRhkBEYBImep08G2JaDAHaFj?pid=ImgDet&rs=1',60,4,8);
INSERT INTO Game VALUES(6,'Carcassonne','https://th.bing.com/th/id/OIP.Nov0duOiE7Mh5CjeKhbGBgHaE8?w=244&h=180&c=7&r=0&o=5&pid=1.7',120,2,8);
INSERT INTO Game VALUES(7,'Ciudadelas','https://ecsmedia.pl/c/asmodee-classic-ciudadelas-board-game-spanish-version-edge-entertainment-edgctd01-assorted-colour-model-b-iext139251342.jpg',30,2,8);
INSERT INTO Game VALUES(8,'Cortex','https://multimedia.dideco.es/img/juego/EAN_3770004936052-5.jpg',15,2,6);
INSERT INTO Game VALUES(9,'DOS','https://th.bing.com/th/id/OIP.fTvlrZclGbcjKy8d7nhHZAHaD4?w=311&h=180&c=7&r=0&o=5&pid=1.7',20,2,12);
INSERT INTO Game VALUES(10,'Dixit','https://m.media-amazon.com/images/I/71FMZqq4ZtL.jpg',30,3,8);
INSERT INTO Game VALUES(11,'Dobble','https://www.jeuxdenim.be/images/jeux/Dobble_large01.jpg',15,2,8);
INSERT INTO Game VALUES(12,'Five Alive','https://www.toys-shop.gr/190649-large_default/five-alive-card-game.jpg',10,2,6);
INSERT INTO Game VALUES(13,'Happy Little Dinosaurs','https://teeturtle-s3-web.s3.amazonaws.com/accounts/2/uploads/HLD-Purchase-Game-1_Boxes_1000x1000-DD.png',30,2,4);
INSERT INTO Game VALUES(14,'Here to Slay','https://th.bing.com/th/id/OIP.X5UdB-lMh_4wBZ2Ng4dBfAHaCm?w=315&h=122&c=7&r=0&o=5&pid=1.7',40,2,10);
INSERT INTO Game VALUES(15,'Hundir la flota','https://th.bing.com/th/id/R.8b249f3feedccc098af96e1b2c8efbbf?rik=r32aZMn8GJIcvQ&pid=ImgRaw&r=0',20,2,2);
INSERT INTO Game VALUES(16,'Joking Hazard','https://muggles.cards/wp-content/uploads/2021/11/Joking-Hazard-Card-Combination-4.jpg',40,3,10);
INSERT INTO Game VALUES(17,'Jungle Speed','https://media.zacatrus.com/catalog/product/cache/f22f70ef8ee260256901b557cf6bf49a/j/u/jungle_speed.jpg',15,3,8);
INSERT INTO Game VALUES(18,'Love Letter','https://whatsericplaying.files.wordpress.com/2021/01/cards-2-3.jpg?w=1024',15,2,6);
INSERT INTO Game VALUES(19,'Monopoly','https://m.media-amazon.com/images/I/81qy+MXuxDL._AC_UF894,1000_QL80_.jpg',120,2,6);
INSERT INTO Game VALUES(20,'Pocket Madness','https://ludessimo.fr/wp-content/uploads/2023/03/a_01_7621-pocket-madness-fun-forge.jpg',40,2,4);
INSERT INTO Game VALUES(21,'Portal de Molthar','https://th.bing.com/th/id/OIP.KzmCcD-E_Dnn5URDw_FpZgHaD4?pid=ImgDet&rs=1',30,2,8);
INSERT INTO Game VALUES(22,'Rummikub','https://th.bing.com/th/id/OIP.33TNzpA-_YQtjBLgJALtRAHaFH?w=250&h=180&c=7&r=0&o=5&pid=1.7',60,2,8);
INSERT INTO Game VALUES(23,'Samurai Sword','https://m.media-amazon.com/images/I/61vNcwnTvLL._AC_UF894,1000_QL80_.jpg',15,3,7);
INSERT INTO Game VALUES(24,'Sushi Go!','https://th.bing.com/th/id/R.5943d256d777f0d9ac7be793db79b642?rik=dSfVsxSjJI0MIg&pid=ImgRaw&r=0',30,2,5);
INSERT INTO Game VALUES(25,'The Grimwood','https://img.fruugo.com/product/1/84/849256841_max.jpg',45,2,6);
INSERT INTO Game VALUES(26,'Tic Tac K.O.','https://th.bing.com/th/id/OIP.s1Hc0oIgRo_7N2JH23HfVgHaKa?rs=1&pid=ImgDetMain',30,2,4);
INSERT INTO Game VALUES(27,'Time Bomb','https://edicionesprimigenio.com/wp-content/uploads/2017/05/pic3554020.jpg',20,4,8);
INSERT INTO Game VALUES(28,'Tiro al pato','https://th.bing.com/th/id/OIP.5OlGiMwBO-_2K6QefJFeegHaHa?pid=ImgDet&rs=1',30,2,8);
INSERT INTO Game VALUES(29,'Tripulación','https://www.theboardgamefamily.com/wp-content/uploads/2020/03/Crew_Choices.jpg',7,2,5);
INSERT INTO Game VALUES(30,'UNO','https://th.bing.com/th/id/OIP.7MMoTxoTY3buZvb7sKZEZAHaEK?w=315&h=180&c=7&r=0&o=5&pid=1.7',20,2,12);
INSERT INTO Game VALUES(31,'Unstable Unicorns','https://teeturtle-s3-web.s3.amazonaws.com/accounts/2/uploads/UU_PurchaseGames.png',30,2,8);
INSERT INTO Game VALUES(32,'Unstable Unicorns Travel Edition','https://teeturtle-s3-web.s3.amazonaws.com/accounts/2/products/1986199882677/Front-82-Card-1-1000x1000.jpg',30,2,4);
INSERT INTO Game VALUES(33,'Virus','https://tranjisgames.com/wp-content/uploads/2019/11/virus1_new-1.png',20,2,6);
INSERT INTO Game VALUES(34,'What do you meme','https://th.bing.com/th/id/R.74ecd7d85d70a101455790856e58a8a0?rik=%2bPadzQ8bCNvI6g&pid=ImgRaw&r=0',40,3,20);
INSERT INTO Game VALUES(35,'Deep Sea Adventure','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRKpuWQrR58af8uRsFxENqtPTS9wrxoHII2EQ&s',20,2,6);
INSERT INTO Game VALUES(36,'Cluedo','https://cdn.ecommercedns.uk/files/8/248218/0/17691480/c001.jpg',90,2,6);
INSERT INTO Game VALUES(37,'Chess','https://images.chesscomfiles.com/uploads/v1/images_users/tiny_mce/NiiLoC/phpIvIkul.jpeg',60,2,2);
INSERT INTO Game VALUES(38,'Trash Pandas','https://img.kwcdn.com/product/1e13cb94884/8fa37cfe-1313-41ee-8fae-c13df0638f47_1000x1000.jpeg',30,2,4);

-- -----------------------------------------------------
-- Table 'OwnedGame'
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS OwnedGame (
    accountId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    PRIMARY KEY (accountId, gameId)
);
INSERT INTO OwnedGame VALUES(1,1);
INSERT INTO OwnedGame VALUES(1,20);
INSERT INTO OwnedGame VALUES(1,22);
INSERT INTO OwnedGame VALUES(1,26);
INSERT INTO OwnedGame VALUES(1,34);
INSERT INTO OwnedGame VALUES(1,24);
INSERT INTO OwnedGame VALUES(1,3);
INSERT INTO OwnedGame VALUES(1,5);
INSERT INTO OwnedGame VALUES(1,6);
INSERT INTO OwnedGame VALUES(1,7);
INSERT INTO OwnedGame VALUES(1,9);
INSERT INTO OwnedGame VALUES(1,13);
INSERT INTO OwnedGame VALUES(1,15);
INSERT INTO OwnedGame VALUES(1,16);
INSERT INTO OwnedGame VALUES(1,30);
INSERT INTO OwnedGame VALUES(1,31);
INSERT INTO OwnedGame VALUES(2,10);
INSERT INTO OwnedGame VALUES(2,11);
INSERT INTO OwnedGame VALUES(2,14);
INSERT INTO OwnedGame VALUES(4,18);
INSERT INTO OwnedGame VALUES(6,28);
INSERT INTO OwnedGame VALUES(6,18);
INSERT INTO OwnedGame VALUES(2,22);
INSERT INTO OwnedGame VALUES(7,19);
INSERT INTO OwnedGame VALUES(7,17);
INSERT INTO OwnedGame VALUES(7,27);
INSERT INTO OwnedGame VALUES(7,12);
INSERT INTO OwnedGame VALUES(7,29);
INSERT INTO OwnedGame VALUES(7,30);
INSERT INTO OwnedGame VALUES(7,9);
INSERT INTO OwnedGame VALUES(7,4);


-- -----------------------------------------------------
-- Table 'UserGroup'
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS UserGroup (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    createdBy INTEGER NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, -- auto set to current time
    FOREIGN KEY (createdBy) REFERENCES Account(id) ON DELETE CASCADE
);
INSERT INTO UserGroup VALUES(1,'UBER',1,'2024-10-03 14:11:14');

-- -----------------------------------------------------
-- Table 'GroupMembership'
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS GroupMembership (
    accountId INTEGER NOT NULL,
    groupId INTEGER NOT NULL,
    joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (groupId) REFERENCES UserGroup(id) ON DELETE CASCADE,
    PRIMARY KEY (accountId, groupId)
);
INSERT INTO GroupMembership VALUES(1,2,'2024-10-03 20:16:12');
INSERT INTO GroupMembership VALUES(2,4,'2024-10-03 21:52:58');
INSERT INTO GroupMembership VALUES(2,2,'2024-10-11 15:46:32');
INSERT INTO GroupMembership VALUES(2,6,'2024-10-14 12:21:03');
INSERT INTO GroupMembership VALUES(4,2,'2025-02-06 19:13:18');
INSERT INTO GroupMembership VALUES(5,2,'2025-02-06 19:18:14');
INSERT INTO GroupMembership VALUES(6,2,'2025-02-06 19:18:58');
INSERT INTO GroupMembership VALUES(7,2,'2025-02-07 12:58:07');

-- -----------------------------------------------------
-- Table 'Invitation'
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Invitation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId INTEGER NOT NULL,
    fromAccountId INTEGER NOT NULL,
    toAccountId INTEGER NOT NULL,
    sentAt DATETIME DEFAULT CURRENT_TIMESTAMP, -- auto set to current time
    FOREIGN KEY (groupId) REFERENCES UserGroup(id),
    FOREIGN KEY (fromAccountId) REFERENCES Account(id),
    FOREIGN KEY (toAccountId) REFERENCES Account(id)
);

-- -----------------------------------------------------
-- Table 'Notification'
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Notification (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    accountId INTEGER NOT NULL,
    type TEXT NOT NULL, -- Example values: 'expelled', 'member_left', 'invitation', 'new_game_added'
    message TEXT NOT NULL, -- Description of the notification
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the notification was created
    isRead BOOLEAN DEFAULT 0, -- 0 = Unread, 1 = Read
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Table 'GameReview' (Account-Game n:m)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS GameReview (
    accountId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    review INTEGER NOT NULL CHECK (review >= 0 AND review <= 10), -- Assuming a review scale from 1 to 5
    reviewDate DATETIME DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the review was made
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    PRIMARY KEY (accountId, gameId) -- Ensures one review per account per game
);
INSERT INTO GameReview VALUES(1,6,10,'2025-02-06 19:19:17');
INSERT INTO GameReview VALUES(1,5,10,'2025-02-06 19:19:19');
INSERT INTO GameReview VALUES(1,7,10,'2025-02-06 19:19:20');
INSERT INTO GameReview VALUES(2,1,10,'2025-02-06 19:19:21');
INSERT INTO GameReview VALUES(1,9,8,'2025-02-06 19:19:22');
INSERT INTO GameReview VALUES(1,10,8,'2025-02-06 19:19:23');
INSERT INTO GameReview VALUES(1,11,8,'2025-02-06 19:19:25');
INSERT INTO GameReview VALUES(1,13,10,'2025-02-06 19:19:27');
INSERT INTO GameReview VALUES(2,5,2,'2025-02-06 19:19:30');
INSERT INTO GameReview VALUES(1,1,10,'2025-02-06 19:19:30');
INSERT INTO GameReview VALUES(2,6,10,'2025-02-06 19:19:32');
INSERT INTO GameReview VALUES(1,14,10,'2025-02-06 19:19:33');
INSERT INTO GameReview VALUES(1,16,8,'2025-02-06 19:19:42');
INSERT INTO GameReview VALUES(1,15,10,'2025-02-06 19:19:43');
INSERT INTO GameReview VALUES(1,18,8,'2025-02-06 19:19:49');
INSERT INTO GameReview VALUES(2,7,4,'2025-02-06 19:19:50');
INSERT INTO GameReview VALUES(1,20,6,'2025-02-06 19:19:50');
INSERT INTO GameReview VALUES(2,9,4,'2025-02-06 19:19:51');
INSERT INTO GameReview VALUES(1,22,8,'2025-02-06 19:19:54');
INSERT INTO GameReview VALUES(1,24,8,'2025-02-06 19:19:56');
INSERT INTO GameReview VALUES(2,11,6,'2025-02-06 19:19:59');
INSERT INTO GameReview VALUES(2,10,4,'2025-02-06 19:20:00');
INSERT INTO GameReview VALUES(2,14,10,'2025-02-06 19:20:10');
INSERT INTO GameReview VALUES(1,34,6,'2025-02-06 19:20:12');
INSERT INTO GameReview VALUES(1,30,4,'2025-02-06 19:20:15');
INSERT INTO GameReview VALUES(1,26,10,'2025-02-06 19:20:18');
INSERT INTO GameReview VALUES(2,15,10,'2025-02-06 19:20:21');
INSERT INTO GameReview VALUES(2,16,8,'2025-02-06 19:20:23');
INSERT INTO GameReview VALUES(1,31,10,'2025-02-06 19:20:23');
INSERT INTO GameReview VALUES(2,22,10,'2025-02-06 19:20:28');
INSERT INTO GameReview VALUES(2,24,8,'2025-02-06 19:21:20');
INSERT INTO GameReview VALUES(2,26,4,'2025-02-06 19:21:22');
INSERT INTO GameReview VALUES(2,30,8,'2025-02-06 19:21:23');
INSERT INTO GameReview VALUES(2,31,2,'2025-02-06 19:21:25');
INSERT INTO GameReview VALUES(2,34,8,'2025-02-06 19:21:27');
INSERT INTO GameReview VALUES(2,28,6,'2025-02-06 19:25:10');
INSERT INTO GameReview VALUES(2,18,10,'2025-02-06 19:25:13');
INSERT INTO GameReview VALUES(1,12,6,'2025-02-11 19:45:14');
INSERT INTO GameReview VALUES(1,28,10,'2025-02-11 19:59:24');
INSERT INTO GameReview VALUES(1,17,2,'2025-02-11 19:59:30');
INSERT INTO GameReview VALUES(1,19,10,'2025-02-11 19:59:34');
INSERT INTO GameReview VALUES(1,29,4,'2025-02-11 19:59:40');
INSERT INTO GameReview VALUES(1,27,6,'2025-02-11 19:59:42');
INSERT INTO GameReview VALUES(1,4,2,'2025-02-11 19:59:50');
INSERT INTO GameReview VALUES(5,1,8,'2025-02-12 11:03:11');
INSERT INTO GameReview VALUES(4,1,4,'2025-02-12 11:03:16');
INSERT INTO GameReview VALUES(4,4,6,'2025-02-12 11:03:18');
INSERT INTO GameReview VALUES(4,6,10,'2025-02-12 11:03:22');
INSERT INTO GameReview VALUES(4,9,4,'2025-02-12 11:03:28');
INSERT INTO GameReview VALUES(5,5,8,'2025-02-12 11:03:30');
INSERT INTO GameReview VALUES(4,11,4,'2025-02-12 11:03:31');
INSERT INTO GameReview VALUES(5,6,10,'2025-02-12 11:03:34');
INSERT INTO GameReview VALUES(4,13,4,'2025-02-12 11:03:36');
INSERT INTO GameReview VALUES(5,4,8,'2025-02-12 11:03:37');
INSERT INTO GameReview VALUES(4,15,6,'2025-02-12 11:03:40');
INSERT INTO GameReview VALUES(5,7,8,'2025-02-12 11:03:43');
INSERT INTO GameReview VALUES(5,10,10,'2025-02-12 11:03:45');
INSERT INTO GameReview VALUES(5,12,6,'2025-02-12 11:03:46');
INSERT INTO GameReview VALUES(4,19,6,'2025-02-12 11:03:48');
INSERT INTO GameReview VALUES(4,22,8,'2025-02-12 11:03:50');
INSERT INTO GameReview VALUES(4,26,4,'2025-02-12 11:03:54');
INSERT INTO GameReview VALUES(5,9,6,'2025-02-12 11:03:54');
INSERT INTO GameReview VALUES(5,11,8,'2025-02-12 11:03:56');
INSERT INTO GameReview VALUES(4,28,6,'2025-02-12 11:03:59');
INSERT INTO GameReview VALUES(5,13,6,'2025-02-12 11:04:00');
INSERT INTO GameReview VALUES(4,30,6,'2025-02-12 11:04:01');
INSERT INTO GameReview VALUES(5,14,10,'2025-02-12 11:04:01');
INSERT INTO GameReview VALUES(5,16,10,'2025-02-12 11:04:03');
INSERT INTO GameReview VALUES(5,18,8,'2025-02-12 11:04:06');
INSERT INTO GameReview VALUES(4,34,4,'2025-02-12 11:04:07');
INSERT INTO GameReview VALUES(5,17,2,'2025-02-12 11:04:14');
INSERT INTO GameReview VALUES(4,5,2,'2025-02-12 11:04:14');
INSERT INTO GameReview VALUES(5,19,2,'2025-02-12 11:04:17');
INSERT INTO GameReview VALUES(4,7,4,'2025-02-12 11:04:20');
INSERT INTO GameReview VALUES(5,24,6,'2025-02-12 11:04:22');
INSERT INTO GameReview VALUES(4,10,4,'2025-02-12 11:04:22');
INSERT INTO GameReview VALUES(5,22,10,'2025-02-12 11:04:24');
INSERT INTO GameReview VALUES(5,26,10,'2025-02-12 11:04:25');
INSERT INTO GameReview VALUES(4,12,4,'2025-02-12 11:04:25');
INSERT INTO GameReview VALUES(5,28,8,'2025-02-12 11:04:27');
INSERT INTO GameReview VALUES(5,29,6,'2025-02-12 11:04:29');
INSERT INTO GameReview VALUES(4,14,8,'2025-02-12 11:04:30');
INSERT INTO GameReview VALUES(5,30,8,'2025-02-12 11:04:30');
INSERT INTO GameReview VALUES(5,34,10,'2025-02-12 11:04:31');
INSERT INTO GameReview VALUES(5,31,10,'2025-02-12 11:04:33');
INSERT INTO GameReview VALUES(4,16,4,'2025-02-12 11:04:33');
INSERT INTO GameReview VALUES(4,18,6,'2025-02-12 11:04:40');
INSERT INTO GameReview VALUES(4,20,6,'2025-02-12 11:04:43');
INSERT INTO GameReview VALUES(4,24,6,'2025-02-12 11:04:45');
INSERT INTO GameReview VALUES(4,29,6,'2025-02-12 11:04:54');
INSERT INTO GameReview VALUES(4,31,8,'2025-02-12 11:05:10');
INSERT INTO GameReview VALUES(1,3,8,'2025-02-12 11:05:59');

-- -----------------------------------------------------
-- Table 'GamePlaySession' (Tracks each play session)
-- -----------------------------------------------------
-- this should be generated based on Meet + MeetAttendee + MeetGame
CREATE TABLE IF NOT EXISTS GamePlaySession (
    accountId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    meetId INTEGER NOT NULL,
    PRIMARY KEY (accountId, gameId, meetId), -- Composite primary key
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    FOREIGN KEY (meetId) REFERENCES Meet(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Table 'Meet'
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Meet (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId INTEGER NOT NULL,
    createdBy INTEGER NOT NULL,
    meetDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    isConfirmed BOOLEAN DEFAULT FALSE, -- If confirmed, cannot be edited
    FOREIGN KEY (groupId) REFERENCES UserGroup(id) ON DELETE CASCADE,
    FOREIGN KEY (createdBy) REFERENCES Account(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Table 'MeetAttendee' (Tracks each member in a meet)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS MeetAttendee (
    meetId INTEGER NOT NULL,
    accountId INTEGER NOT NULL,
    FOREIGN KEY (meetId) REFERENCES Meet(id) ON DELETE CASCADE,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    PRIMARY KEY (meetId, accountId)
);

-- -----------------------------------------------------
-- Table 'MeetGame' (Games selected for the meet)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS MeetGame (
    meetId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    FOREIGN KEY (meetId) REFERENCES Meet(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    PRIMARY KEY (meetId, gameId)
);

-- -----------------------------------------------------
-- Table 'FeatureFlags' (Feature flags for the app)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS FeatureFlags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    isEnabled BOOLEAN DEFAULT FALSE,
    description TEXT, -- Optional, for documentation purposes
    lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO FeatureFlags (name, isEnabled, description) VALUES ('admin_debugging', 1, 'Enable debugging features for admins');

-- -----------------------------------------------------
-- Indexes for faster access to the data
-- -----------------------------------------------------
CREATE INDEX idx_notification_accountId ON Notification(accountId);
CREATE INDEX idx_groupmembership_accountId ON GroupMembership(accountId);
CREATE INDEX idx_ownedgame_gameId ON OwnedGame(gameId);

COMMIT;
```
