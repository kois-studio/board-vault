# Database Management

Here are the docs to manage the DB from Turso CLI:

https://docs.turso.tech/cli/db/shell

## CREATE DUMP

To make a dump run:

```shell
turso db list # to see the <database-name> 
turso db shell <database-name> .dump > dump.sql
```

## RESTORE DUMP

Create a brand new DB in Turso. Then create a `dump.sql` file with the content below and run:

```shell
turso db shell <database-name> < dump.sql
```    

Copy this inside the `dump.sql` file before.

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
    isDeleted BOOLEAN DEFAULT FALSE -- soft delete
    isAdmin BOOLEAN DEFAULT FALSE -- indicates if the account is an admin
);
INSERT INTO Account VALUES(1,'david@test.com','dawichi','$2b$10$CpIDmTErYFytqH2DWripr.xN60wARDTHwkvpPUmQUJxe1iHIvEYeu','https://pbs.twimg.com/profile_images/1332020756033712130/ZXD9wpQR_400x400.jpg','David M. Fajardo','2024-10-04 13:08:19',0,1);
INSERT INTO Account VALUES(2,'alex@test.com','alexwwe','$2b$10$It2eJ2E6deeU7UBbti9tUOpZGq0J9HnmtS1qquUcEDcxKNHruz2ca','https://pbs.twimg.com/profile_images/991696745418711040/17X66VeI_400x400.jpg','alexwwe','2024-10-03 10:32:18',0,1);
INSERT INTO Account VALUES(3,'test@test.com','test','$2b$10$aO6PuKn0.VDQ.PkAXpw9Sen1DH7T/wtmkeAhv7iy/NGA.JsmC7bT.','https://pbs.twimg.com/profile_images/1833050358479826944/A2qj0e6Z_400x400.jpg','test 1','2024-10-03 09:57:58',0,1);

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
INSERT INTO Game VALUES(1,'4 en raya','https://th.bing.com/th/id/OIP.NBji9WnY4r87KmccdUEmlwHaHa?w=192&h=192&c=7&r=0&o=5&pid=1.7',5,2,2);
INSERT INTO Game VALUES(2,'Arre Unicornio','https://media.zacatrus.com/catalog/product/cache/f22f70ef8ee260256901b557cf6bf49a/h/u/huelicorne_1_.jpg',30,2,8);
INSERT INTO Game VALUES(3,'Backgammon','https://th.bing.com/th/id/R.90c3fd5a43919242e8cd008613530dbe?rik=VxmqiRuHOBrt%2bw&riu=http%3a%2f%2ftechdoorblog.weebly.com%2fuploads%2f1%2f3%2f0%2f1%2f130136186%2f610bozupxml-sl1024-ccccccc_orig.jpg&ehk=oxswxAfqc3XydB9ZAH%2bF%2fdEqP%2fHRJoqNIz934RxPueM%3d&risl=&pid=ImgRaw&r=0',60,2,2);
INSERT INTO Game VALUES(4,'Baraja Española','https://www.asesmus.com/wp-content/uploads/2022/08/71Y5q39MbfL._AC_SL1309_.jpg',20,2,8);
INSERT INTO Game VALUES(5,'Bote salvavidas','https://th.bing.com/th/id/OIP.m6LRhkBEYBImep08G2JaDAHaFj?pid=ImgDet&rs=1',60,4,8);
INSERT INTO Game VALUES(6,'Carcassonne','https://th.bing.com/th/id/OIP.Nov0duOiE7Mh5CjeKhbGBgHaE8?w=244&h=180&c=7&r=0&o=5&pid=1.7',120,2,8);
INSERT INTO Game VALUES(7,'Ciudadelas','https://th.bing.com/th/id/R.2a22f47ceab0f39bd123afb59eae194b?rik=OR5wboES7cP97A&pid=ImgRaw&r=0',30,2,8);
INSERT INTO Game VALUES(8,'Cortex','https://multimedia.dideco.es/img/juego/EAN_3770004936052-5.jpg',15,2,6);
INSERT INTO Game VALUES(9,'DOS','https://th.bing.com/th/id/OIP.fTvlrZclGbcjKy8d7nhHZAHaD4?w=311&h=180&c=7&r=0&o=5&pid=1.7',20,2,12);
INSERT INTO Game VALUES(10,'Dixit','https://m.media-amazon.com/images/I/71FMZqq4ZtL.jpg',30,3,8);
INSERT INTO Game VALUES(11,'Dobble','https://www.jeuxdenim.be/images/jeux/Dobble_large01.jpg',15,2,8);
INSERT INTO Game VALUES(12,'Five Alive','https://shop.hasbro.com/_next/image?url=https%3A%2F%2Fwww.hasbro.com%2Fcommon%2Fproductimages%2Fes_ES%2FE88849455863402891467E2D8B61DE43%2F65fb64a2039648648ec1d6829b16ddcd30074b38.jpg&w=640&q=75',10,2,6);
INSERT INTO Game VALUES(13,'Happy Little Dinosaurs','https://teeturtle-s3-web.s3.amazonaws.com/accounts/2/uploads/HLD-Purchase-Game-1_Boxes_1000x1000-DD.png',30,2,4);
INSERT INTO Game VALUES(14,'Here to Slay','https://th.bing.com/th/id/OIP.X5UdB-lMh_4wBZ2Ng4dBfAHaCm?w=315&h=122&c=7&r=0&o=5&pid=1.7',40,2,10);
INSERT INTO Game VALUES(15,'Hundir la flota','https://th.bing.com/th/id/R.8b249f3feedccc098af96e1b2c8efbbf?rik=r32aZMn8GJIcvQ&pid=ImgRaw&r=0',20,2,2);
INSERT INTO Game VALUES(16,'Joking Hazard','https://th.bing.com/th/id/OIP.oNOfxhiKuQ3tE3qn7kK_2QHaEJ?pid=ImgDet&rs=1',40,3,10);
INSERT INTO Game VALUES(17,'Jungle Speed','https://media.zacatrus.com/catalog/product/cache/f22f70ef8ee260256901b557cf6bf49a/j/u/jungle_speed.jpg',15,3,8);
INSERT INTO Game VALUES(18,'Love Letter','https://whatsericplaying.files.wordpress.com/2021/01/cards-2-3.jpg?w=1024',15,2,6);
INSERT INTO Game VALUES(19,'Monopoly','https://m.media-amazon.com/images/I/81qy+MXuxDL._AC_UF894,1000_QL80_.jpg',120,2,6);
INSERT INTO Game VALUES(20,'Pocket Madness','https://th.bing.com/th/id/OIP.y92E0oJAnKHqqgC-cXAGmgHaEg?pid=ImgDet&rs=1',40,2,4);
INSERT INTO Game VALUES(21,'Portal de Molthar','https://th.bing.com/th/id/OIP.KzmCcD-E_Dnn5URDw_FpZgHaD4?pid=ImgDet&rs=1',30,2,8);
INSERT INTO Game VALUES(22,'Rummikub','https://th.bing.com/th/id/OIP.33TNzpA-_YQtjBLgJALtRAHaFH?w=250&h=180&c=7&r=0&o=5&pid=1.7',60,2,8);
INSERT INTO Game VALUES(23,'Samurai Sword','https://m.media-amazon.com/images/I/61vNcwnTvLL._AC_UF894,1000_QL80_.jpg',15,3,7);
INSERT INTO Game VALUES(24,'Sushi Go!','https://th.bing.com/th/id/R.5943d256d777f0d9ac7be793db79b642?rik=dSfVsxSjJI0MIg&pid=ImgRaw&r=0',30,2,5);
INSERT INTO Game VALUES(25,'The Grimwood','https://img.fruugo.com/product/1/84/849256841_max.jpg',45,2,6);
INSERT INTO Game VALUES(26,'Tic Tac K.O.','https://12ax7web.s3.amazonaws.com/accounts/1/uploads/TTKO-Landing-Page-01-PurchaseGame_V2.png',30,2,4);
INSERT INTO Game VALUES(27,'Time Bomb','https://edicionesprimigenio.com/wp-content/uploads/2017/05/pic3554020.jpg',20,4,8);
INSERT INTO Game VALUES(28,'Tiro al pato','https://th.bing.com/th/id/OIP.5OlGiMwBO-_2K6QefJFeegHaHa?pid=ImgDet&rs=1',30,2,8);
INSERT INTO Game VALUES(29,'Tripulación','https://www.theboardgamefamily.com/wp-content/uploads/2020/03/Crew_Choices.jpg',7,2,5);
INSERT INTO Game VALUES(30,'UNO','https://th.bing.com/th/id/OIP.7MMoTxoTY3buZvb7sKZEZAHaEK?w=315&h=180&c=7&r=0&o=5&pid=1.7',20,2,12);
INSERT INTO Game VALUES(31,'Unstable Unicorns','https://teeturtle-s3-web.s3.amazonaws.com/accounts/2/uploads/UU_PurchaseGames.png',30,2,8);
INSERT INTO Game VALUES(32,'Unstable Unicorns Travel Edition','https://teeturtle-s3-web.s3.amazonaws.com/accounts/2/products/1986199882677/Front-82-Card-1-1000x1000.jpg',30,2,4);
INSERT INTO Game VALUES(33,'Virus','https://tranjisgames.com/wp-content/uploads/2019/11/virus1_new-1.png',20,2,6);
INSERT INTO Game VALUES(34,'What do you meme','https://th.bing.com/th/id/R.74ecd7d85d70a101455790856e58a8a0?rik=%2bPadzQ8bCNvI6g&pid=ImgRaw&r=0',40,3,20);

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
INSERT INTO UserGroup VALUES(1,'Davids Group',1,'2024-10-03 14:07:51');
INSERT INTO UserGroup VALUES(2,'UBER',1,'2024-10-03 14:11:14');
INSERT INTO UserGroup VALUES(3,'Family',1,'2024-10-03 14:11:19');
INSERT INTO UserGroup VALUES(4,'Alexs Group',2,'2024-10-03 21:52:24');
INSERT INTO UserGroup VALUES(5,'alexGrupo1',2,'2024-10-14 12:21:03');
INSERT INTO UserGroup VALUES(6,'prueba2',2,'2024-10-14 12:51:23');

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
INSERT INTO GroupMembership VALUES(1,1,'2024-10-03 14:21:24');
INSERT INTO GroupMembership VALUES(1,3,'2024-10-03 20:16:12');
INSERT INTO GroupMembership VALUES(1,2,'2024-10-03 20:16:12');
INSERT INTO GroupMembership VALUES(2,1,'2024-10-03 21:52:02');
INSERT INTO GroupMembership VALUES(2,4,'2024-10-03 21:52:58');
INSERT INTO GroupMembership VALUES(1,4,'2024-10-11 15:44:29');
INSERT INTO GroupMembership VALUES(2,2,'2024-10-11 15:46:32');
INSERT INTO GroupMembership VALUES(2,3,'2024-10-11 15:55:53');
INSERT INTO GroupMembership VALUES(2,6,'2024-10-14 12:21:03');
INSERT INTO GroupMembership VALUES(1,6,'2024-10-15 12:02:59');

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
INSERT INTO Notification VALUES(1,2,'invitation_accepted','David M. Fajardo joined your group Alex''s Group','2024-10-11 11:28:44',0);
INSERT INTO Notification VALUES(2,2,'invitation_accepted','David M. Fajardo joined your group Alex''s Group','2024-10-11 11:31:02',0);
INSERT INTO Notification VALUES(3,2,'invitation_accepted','David M. Fajardo joined your group Alex''s Group','2024-10-11 11:33:12',0);
INSERT INTO Notification VALUES(4,2,'invitation_accepted','alexwwe joined your group Family','2024-10-11 11:55:31',0);
INSERT INTO Notification VALUES(5,2,'invitation_accepted','David M. Fajardo joined your group Alex''s Group','2024-10-11 15:44:30',0);
INSERT INTO Notification VALUES(6,2,'invitation_accepted','alexwwe joined your group UBER','2024-10-11 15:46:32',0);
INSERT INTO Notification VALUES(7,2,'invitation_accepted','alexwwe joined your group Family','2024-10-11 15:55:53',0);
INSERT INTO Notification VALUES(8,2,'invitation_accepted','David M. Fajardo joined your group alexGrupo1','2024-10-15 12:03:00',0);
INSERT INTO Notification VALUES(9,2,'invitation_accepted','David M. Fajardo joined your group undefined','2024-10-15 12:03:01',0);
INSERT INTO Notification VALUES(10,2,'invitation_accepted','David M. Fajardo joined your group prueba2','2024-10-15 12:25:58',0);

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

-- -----------------------------------------------------
-- Table 'GamePlaySession' (Tracks each play session)
-- -----------------------------------------------------
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
