# Project definition

The project consists of 3 main parts:

1. backend - NestJS API
2. frontend - Angular 19
3. DB - Turso SQLite

## Project idea

BoardVault (the project) helps you organize tabletop game nights by tracking your collection, recommending the best games for your group, and keeping a history of your gaming sessions.

### Track Your Collection
Add all your tabletop games to your digital shelf. Rate them, see your play history, and share with friends.

### Create Gaming Groups
Organize friends into groups. See which games your group collectively owns and track your play history together.

### Plan Game Sessions
Schedule meetups with specific friends and let BoardMeet recommend the perfect games based on player count, time available, and preferences.

### Track Statistics
See your most-played games, view play history, and check stats for individuals, groups, or the entire platform.

# Database definition

The main database is a SQLite hosted in turso.tech.

```sql
-- -----------------------------------------------------
-- Table 'Account'
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Account (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    avatar TEXT, -- JSON structure to store avatar configuration
    displayName VARCHAR(255), -- Custom name, can be NULL initially
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- auto set to current time
    isDeleted BOOLEAN DEFAULT FALSE, -- soft delete
    isAdmin BOOLEAN DEFAULT FALSE, -- indicates if the account is an admin
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token TEXT,
    password_reset_token TEXT
);

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

-- -----------------------------------------------------
-- Table 'OwnedGame' (Account-Game n:m)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS OwnedGame (
    accountId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    purchasePrice DECIMAL(10, 2),
    purchaseDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    purchaseNotes TEXT, -- for recording if it was a gift or other details
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    PRIMARY KEY (accountId, gameId)
);

-- -----------------------------------------------------
-- Table 'WishlistedGame' (Account-Game n:m)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS WishlistedGame (
    accountId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    dateAdded DATETIME DEFAULT CURRENT_TIMESTAMP,
    priority INTEGER DEFAULT 3, -- 1-5 scale for wishlist priority
    notes TEXT, -- any note you want to add to the game
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    PRIMARY KEY (accountId, gameId)
);

-- -----------------------------------------------------
-- Table 'Tag'
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Tag (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    categoryId INTEGER NOT NULL,
    FOREIGN KEY (categoryId) REFERENCES TagCategory(id) ON DELETE CASCADE,
    UNIQUE (id, categoryId)
);

-- -----------------------------------------------------
-- Table 'TagCategory'
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS TagCategory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

-- -----------------------------------------------------
-- Table 'GameTag' (Game-Tag n:m)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS GameTag (
    gameId INTEGER NOT NULL,
    tagId INTEGER NOT NULL,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    FOREIGN KEY (tagId) REFERENCES Tag(id) ON DELETE CASCADE,
    PRIMARY KEY (gameId, tagId)
);

-- -----------------------------------------------------
-- Table 'UserGroup' (Account-Group 1:n)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS UserGroup (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    createdBy INTEGER NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, -- auto set to current time
    FOREIGN KEY (createdBy) REFERENCES Account(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Table 'GroupMembership' (Account-Group n:m)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS GroupMembership (
    accountId INTEGER NOT NULL,
    groupId INTEGER NOT NULL,
    joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (groupId) REFERENCES UserGroup(id) ON DELETE CASCADE,
    PRIMARY KEY (accountId, groupId)
);

-- -----------------------------------------------------
-- Table 'Invitation' (Account-Group n:m)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Invitation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId INTEGER NOT NULL,
    fromAccountId INTEGER NOT NULL,
    toAccountId INTEGER NOT NULL,
    sentAt DATETIME DEFAULT CURRENT_TIMESTAMP, -- auto set to current time
    FOREIGN KEY (groupId) REFERENCES UserGroup(id) ON DELETE CASCADE,
    FOREIGN KEY (fromAccountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (toAccountId) REFERENCES Account(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Table 'Notification' (Account-Notification 1:n)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Notification (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    accountId INTEGER NOT NULL,
    type TEXT NOT NULL, -- Example values: 'meeting_scheduled', 'games_added', 'user_joined_group'
    message TEXT NOT NULL, -- Can be a template with placeholders like "{user} added {count} games"
    data TEXT NOT NULL, -- JSON data containing relevant IDs and context
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

-- -----------------------------------------------------
-- Table 'CollectionActivity' (Account-Game n:m)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS CollectionActivity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    accountId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    actionType TEXT NOT NULL, -- 'added', 'rated', 'wishlisted', 'removed'
    actionDetails TEXT, -- JSON for additional details like rating value
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE
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
-- Table 'MeetAccountGame' (Who played which games at which meet)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS MeetAccountGame (
    meetId INTEGER NOT NULL,
    accountId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    FOREIGN KEY (meetId) REFERENCES Meet(id) ON DELETE CASCADE,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    PRIMARY KEY (meetId, accountId, gameId)
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
```

# BoardVault Architecture & Controllers Organization

BoardVault helps organize tabletop game nights by tracking your game collection, managing gaming groups, and planning gaming sessions. This document explains how we structure our NestJS backend, with a clear separation between core CRUD operations and extended logic endpoints.

---

## 1. Project Structure Overview

We follow a Domain-Driven Design (DDD) approach along with feature-based module organization. The project is divided into:

- **Core Modules:** Handle basic CRUD operations for individual entities.
- **Feature Modules:** Implement extended, cross-domain business logic.
- **Common Modules:** Provide shared functionality (database connection, authentication, etc.).

Below is a simplified folder structure:

```
src/
├── modules/
│   ├── core/                  # Core domain modules (basic CRUD operations)
│   │   ├── users/
│   │   │   ├── users.controller.ts   // Basic user CRUD endpoints
│   │   │   └── users.service.ts
│   │   ├── games/
│   │   ├── groups/
│   │   └── ... 
│   │
│   ├── features/              # Extended logic endpoints across multiple domains
│   │   ├── dashboard/
│   │   │   ├── dashboard.controller.ts  // Extended endpoints for user-related game logic
│   │   │   └── dashboard.service.ts
│   │   ├── collection/
│   │   ├── play/
│   │   └── ...
│   │
│   │   # other modules
│   └── common/                # Shared modules (e.g., database, auth, email)
```

### Data Access Flow

We enforce a strict data access pattern throughout the application:

1. **Core modules** are the only modules with direct access to database and cache modules.
2. **Feature modules** must access data through core modules, never directly from the database or cache.

This creates a unidirectional flow of dependencies:
- For CRUD operations: `Controller → Core Module → Database/Cache`
- For feature operations: `Controller → Feature Module → Multiple Core Modules → Database/Cache`

This structure prevents circular dependencies and maintains clear separation of responsibilities.

---

## 2. Core Modules

**Core Modules** are responsible for handling the basics — creating, reading, updating, and deleting individual entities. They focus on a single domain entity, such as _users_, _games_, or _groups_.

### Example: Users Core Module

#### `modules/core/users/users.controller.ts`
```typescript
import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  async getUser(@Param('id') id: number) {
    return this.usersService.getUserById(id);
  }

  @Post()
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }
  // Other basic CRUD endpoints
}
```

---

## 3. Feature Modules

**Feature Modules** are designed for extended logic that spans multiple domains. They inject services from the core modules to construct complex operations. Their focus is on business processes rather than simple CRUD.

### Example: Extended User Games Logic

#### `modules/features/dashboard/dashboard.controller.ts`
```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get(':id/games/:gameId')
  async getUserGame(
    @Param('id') userId: number,
    @Param('gameId') gameId: number
  ) {
    return this.dashboardService.getUserGames(userId, gameId);
  }
  // Other extended endpoints such as reviews or invitations
}
```

#### `modules/features/dashboard/dashboard.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { UsersService } from '../../core/users/users.service';
import { GamesService } from '../../core/games/games.service';
import { OwnedGamesService } from '../../core/owned-games/owned-games.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly usersService: UsersService,
    private readonly gamesService: GamesService,
    private readonly ownedGamesService: OwnedGamesService,
    // Other required core services
  ) {}

  async getUserGame(userId: number, gameId: number) {
    // This service orchestrates calls to multiple core services
    // but never accesses the database directly
    const user = await this.usersService.getUserById(userId);
    const game = await this.gamesService.getGameById(gameId);
    const ownership = await this.ownedGamesService.getOwnership(userId, gameId);
    
    // Combine and transform data
    return { user, game, ownership };
  }
}
```

### Integration Details

Both the **Core** and **Feature** controllers share a common base path (in this case `/users`). This means:
- Basic user operations, like `/users/:id`, are handled by `UsersController`.
- Extended operations, like `/users/:id/games/:gameId`, are handled by `UserGamesController`.

This approach provides a clear and intuitive API for consumers while keeping internal code responsibilities well separated.

---

## 4. Example: Get all groups of a user

Let's see a real example of how this works in practice.

We want a endpoint to get all groups of a user. This should return also, for each group, a complete list of its members and their games and reviews.

This, previously, was done in `users.service.ts`, that needed to import multiple other services and forcing a couple circular dependencies.

![back modules](../images/back-modules.png)

Now, we can do this in `features/dashboard.service.ts` by injecting the required `/core` services through the NestJS dependency injection system.

In this service, we import each `/core` service that we need to use. This allows later to build whatever complex structure the frontend may need, without having to manage any logic apart from the composition of the data.

Each individual service is responsible for accessing the database or cache depending of its needs, is responsible for parsing and validating the data against each Zod schema, declaring the DTOs and types, and so on.

```typescript
@Injectable()
export class DashboardService {
    constructor(
        private readonly usersService: UsersService,
        private readonly groupsService: GroupsService,
        private readonly groupMembershipsService: GroupMembershipsService,
        private readonly gamesOwnedService: GamesOwnedService,
        private readonly gamesService: GamesService,
        private readonly reviewsService: ReviewsService,
    ) {}

    @LogFeature(new Logger('DashboardService'))
    async getGroupsOfUser(userId: number): Promise<Array<GroupWithMembersAndGames>> {
        const memberships = await this.groupMembershipsService.getGroupMembershipsByAccountId(userId)
        const groupsWithMembers = await Promise.all(memberships.map(async membership => {
            // the group data
            const group = await this.groupsService.getGroupById(membership.groupId)
            // the members of the group
            const _memberships = await this.groupMembershipsService.getGroupMembershipsByGroupId(membership.groupId)
            const members: Array<GroupMemberWithGames> = await Promise.all(_memberships.map(async _membership => {
                const user = await this.usersService.getUserById(_membership.accountId)
                const gamesOwned = await this.gamesOwnedService.getGamesOwnedByAccountId(_membership.accountId)
                const games = await Promise.all(gamesOwned.map(game => this.gamesService.getGameById(game.gameId)))

                const userWithGames: UserWithGames = { ...user, games }
                const userReviews = await this.reviewsService.getGameReviewsByAccountId(_membership.accountId)

                return {
                    ...userWithGames,
                    joinedAt: _membership.joinedAt,
                    reviews: userReviews,
                }
            }))

            return { ...group, members }
        }))

        return groupsWithMembers
    }
}
```

---

## 5. Benefits of This Organization

- **Separation of Concerns:** Core modules focus solely on basic data operations, while feature modules encapsulate complex business logic.
- **Modularity:** The codebase remains organized, making it easier to maintain, test, and extend.
- **Flexible Routing:** Controllers can share a base path (e.g., `/users`), making API endpoints logical and consistent without forcing complex URL prefixes.
- **Decoupled Dependencies:** By using interfaces and dependency injection, extended logic is kept separate from basic CRUD operations.
- **Clear Data Access Pattern:** The enforced unidirectional data flow (feature → core → database) prevents circular dependencies and promotes clean architecture.

---

## 6. Extra: Event-Based Communication (Optional)

For additional decoupling, you might consider **event-based communication** as an option. This involves emitting events when specific actions occur (e.g., a user adds a game), allowing other parts of the system to react without a direct dependency. While not used in the current implementation, it's a strategy to explore if you need looser coupling in the future.

---

*This document provides an architectural overview and guides you through the logical separation of controllers and modules in the BoardVault backend. The chosen strategy helps maintain clarity and scalability in handling both simple and complex operations as the application grows.*


# Frontend structure definition

The frontend, after you log in, has 3 main views with some sub-views:


1. Dashboard - the page you see after you log in
    1.1 My Groups - a list of groups you are a member of. after click, you can manage it

2. Collection - a page to manage your collection
    2.1 My Games - a list of games you own
    2.2 Browse and Discover - a page to browse and discover new games to add to your collection
    2.3 Wishlist - a list of games you want to add to your collection
    2.4 Reviews - a list of reviews you have about games (owned or not)

3. Play - a page to plan and track your play sessions
    3.1 My Meets - a list of meets you have planned
    3.2 Game Recommendations - a page to get recommendations based on your collection and play history
    3.3 Play History - a list of games you have played
    3.4 Play Statistics - a page to view statistics about your play sessions

Those subsections are "blocks", so for example in the collection and play, you will see a 2x2 grid of blocks, each block being a subsection.

Under them we will have some extra data related to the general section.
For example in the dashboard, we will have a block about "recent activity" of other members of your groups.
And for collection, some notifications about your collection's activity: games added, reviews added, wishlisted games, etc.
