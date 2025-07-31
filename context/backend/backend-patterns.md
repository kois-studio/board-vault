# Backend Development Patterns & Conventions

This document captures important backend patterns, conventions, and learnings from implementing the BoardVault NestJS API.

## Type Organization & Naming Conventions

### Request vs Response Type Naming

**Request Body Types**: Use `-Body` suffix
```typescript
// ✅ Correct - Request body types
export class UpdateGameTranslationsBody { ... }
export class UpdateGameTagsBody { ... }
export class CreateNotificationBody { ... }
export class UpdateNotificationBody { ... }
```

**Response Types**: Use `-Dto` suffix. They contain a @ApiProperty decorator to describe the response for swagger.
```typescript
// ✅ Correct - Response DTOs
export class GameWithTagsAndTranslationsDto { ... }
export class GameCompleteDto { ... }
export class TagCategoryWithTagsDto { ... }
```

**Base Types**: Does not really matter. Most use `-Dto` or `-Type` suffix.
```typescript
// ✅ Correct - Base entity types
export class GameDto { ... }
export class TagDto { ... }
export class UserDto { ... }
```

### Type File Organization

**Location**: All types should be in `backend/src/common/types/`
```
backend/src/common/types/
├── admin.type.ts          ← Admin-specific request bodies
├── game.type.ts           ← Game-related DTOs
├── tag.type.ts            ← Tag-related DTOs
├── auth.type.ts           ← Authentication types
└── ...
```

**Rule**: Never place DTOs in module directories (e.g., `admin.types.ts` in admin module)

### Type Placement Logic

- **Entity-specific DTOs**: Place in corresponding entity type file
  - `GameTagWithCategoryDto` → `tag.type.ts` (tag-related)
  - `GameWithTagsAndTranslationsDto` → `game.type.ts` (game-related)

- **Cross-cutting DTOs**: Place in appropriate domain file
  - Admin request bodies → `admin.type.ts`
  - Authentication types → `auth.type.ts`

## Swagger Documentation Patterns

### Self-Documenting DTOs

Use `@ApiProperty()` decorators for automatic Swagger generation:

```typescript
export class UpdateGameTranslationsBody {
    @ApiProperty({ 
        description: 'English translation of the game title',
        example: 'Catan',
        required: false
    })
    en?: string

    @ApiProperty({ 
        description: 'Spanish translation of the game title',
        example: 'Catan',
        required: false
    })
    es?: string
}
```

**Benefits**:
- Automatic Swagger schema generation
- Self-documenting code
- Type safety with examples
- No manual schema declarations needed

### Controller Response Documentation

```typescript
@ApiResponse({ 
    status: 200, 
    description: 'List of all games with translations and tags',
    type: [GameWithTagsAndTranslationsDto]  // Use DTO type, not manual schema
})
```

## Type Safety Patterns

### Supported Language Type Safety

Use `SupportedLanguage` type instead of generic `Record<string, string>`:

```typescript
// ❌ Generic and unsafe
translations: Record<string, string>

// ✅ Type-safe with specific languages
translations: Record<SupportedLanguage, string>
```

**Benefits**:
- Compile-time checking for valid language codes
- IntelliSense support
- Easy to extend for new languages
- Consistent across frontend and backend

### Proper Type Imports

Import types from their proper locations:

```typescript
// ✅ Correct imports
import { GameTagWithCategoryDto } from '../../../common/types/tag.type'
import { GameWithTagsAndTranslationsDto } from '../../../common/types/game.type'
import { UpdateGameTranslationsBody } from '../../../common/types/admin.type'

// ❌ Avoid inline type definitions in services
type AdminGameWithDetails = GameDto & { ... }  // Don't do this
```

## Backend Architecture Patterns

### Admin Module Structure

**Controller**: Handle HTTP requests and responses
```typescript
@Controller('admin')
export class AdminController {
    @Get('/games')
    async getGames() {
        return this.adminService.getAdminGames()
    }
}
```

**Service**: Orchestrate core services
```typescript
@Injectable()
export class AdminService {
    constructor(
        private readonly gameService: GamesService,
        private readonly gameTranslationService: GameTranslationService,
        private readonly gameTagsService: GameTagsService,
        // Inject core services, never access database directly
    ) {}

    async getAdminGames(): Promise<Array<GameWithTagsAndTranslationsDto>> {
        // Orchestrate calls to multiple core services
        const games = await this.gameService.getGames()
        // Transform and combine data
        return Promise.all(games.map(async game => { ... }))
    }
}
```

**Rule**: Admin services should orchestrate core services, never access database directly.

### Database Service Patterns

Add missing methods to `DatabaseService` when needed:

```typescript
// Add to DatabaseService when core services need them
getGames() {
    return this._tursoExecute('SELECT * FROM Game ORDER BY id')
}

addGameTag(gameId: number, tagId: number) {
    return this._tursoExecute({
        sql: 'INSERT INTO GameTag (gameId, tagId) VALUES (?, ?)',
        args: [gameId, tagId],
    })
}
```

## Error Handling Patterns

### Service Error Handling

```typescript
async updateGameTranslations(gameId: number, translations: UpdateGameTranslationsBody): Promise<{ success: boolean }> {
    try {
        // Update each translation
        for (const [languageCode, title] of Object.entries(translations)) {
            if (title?.trim()) {  // Null-safe check
                await this.gameTranslationService.createGameTranslation(gameId, languageCode, title)
            }
        }
        return { success: true }
    } catch (error) {
        this.LOGGER.error('Failed to update game translations', error)
        throw error  // Let controller handle HTTP response
    }
}
```

## Cache Invalidation Patterns

### Service Cache Management

```typescript
async addGameTag(gameId: number, tagId: number): Promise<{ success: boolean }> {
    await this.databaseService.addGameTag(gameId, tagId)
    
    // Clear cache after modification
    await this.cacheService.deleteOne(`${this.CACHE_KEY}:byGameId:${gameId}`)
    
    return { success: true }
}
```

## Key Learnings

1. **Type Safety First**: Always use proper types instead of generics
2. **Consistent Naming**: Follow established conventions (-Body for requests, -Dto for responses)
3. **Proper Organization**: Keep types in `common/types/` directory
4. **Self-Documentation**: Use `@ApiProperty()` for automatic Swagger generation
5. **Service Orchestration**: Admin services should coordinate core services
6. **Cache Management**: Always invalidate cache after data modifications
7. **Error Handling**: Use proper logging and error propagation

## Anti-Patterns to Avoid

1. ❌ **Inline type definitions** in services
2. ❌ **Manual Swagger schemas** when DTOs exist
3. ❌ **Generic Record types** when specific types are available
4. ❌ **Direct database access** from admin services
5. ❌ **Inconsistent naming conventions**
6. ❌ **Types scattered across module directories** 
