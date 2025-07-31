# Frontend Development Patterns & Conventions

This document captures important frontend patterns, conventions, and technical standards for the BoardVault Angular 19 application.

## Technical Stack & Standards

### Angular 19 Modern Syntax

**Use latest Angular syntax patterns:**

```typescript
// ✅ Modern Angular 19 patterns
export class GameListComponent {
    // Use inject() instead of constructor injection
    private apiService = inject(GameApiService)
    private router = inject(Router)
    
    // Use signals for reactive state
    public games = signal<Array<GameType>>([])
    public isLoading = signal<boolean>(false)
    
    // Use @if instead of *ngIf
    // Use @for instead of *ngFor
}
```

**Template syntax:**
```html
<!-- ✅ Modern Angular 19 template syntax -->
@if (isLoading()) {
    <div class="loading-spinner">Loading...</div>
} @else {
    @for (game of games(); track game.id) {
        <app-game-card [game]="game" />
    }
}
```

### Styling Standards

**Use Tailwind CSS classes exclusively:**

```html
<!-- ✅ Use Tailwind CSS classes -->
<div class="flex flex-col space-y-4 p-6 bg-white rounded-lg shadow-md">
    <h2 class="text-2xl font-bold text-gray-900">Game Collection</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (game of games(); track game.id) {
            <div class="bg-gray-50 p-4 rounded-lg hover:shadow-lg transition-shadow">
                <img [src]="game.imageUrl" [alt]="game.title" 
                     class="w-full h-48 object-cover rounded-md mb-3">
                <h3 class="text-lg font-semibold text-gray-800">{{ game.title }}</h3>
            </div>
        }
    </div>
</div>
```

**CSS/SCSS files should be minimal:**
- Only use for complex animations or very specific styling needs
- Keep `styles.scss` for global styles only
- Avoid component-specific CSS files unless absolutely necessary

## Component Architecture

### Feature-Based Organization

```
src/app/
├── core/                    # Core functionality
│   ├── guards/
│   ├── interceptors/
│   └── services/
├── shared/                  # Shared components
│   ├── components/
│   ├── pipes/
│   └── directives/
├── features/                # Feature modules
│   ├── dashboard/
│   ├── collection/
│   ├── play/
│   └── admin/
└── app.component.ts
```

### Component Patterns

**Smart Components (Containers):**
```typescript
export class GameCollectionComponent {
    private apiService = inject(GameApiService)
    
    public games = signal<Array<GameType>>([])
    public isLoading = signal<boolean>(false)
    public error = signal<string | null>(null)
    
    ngOnInit() {
        this.loadGames()
    }
    
    private loadGames(): void {
        this.isLoading.set(true)
        this.apiService.getGames().subscribe({
            next: games => this.games.set(games),
            error: error => this.error.set(error.message),
            complete: () => this.isLoading.set(false)
        })
    }
}
```

**Dumb Components (Presentational):**
```typescript
export class GameCardComponent {
    @Input() game!: GameType
    @Output() gameSelected = new EventEmitter<GameType>()
    
    onGameClick(): void {
        this.gameSelected.emit(this.game)
    }
}
```

## State Management

### Angular Signals

**Local Component State:**
```typescript
export class GameListComponent {
    public games = signal<Array<GameType>>([])
    public filteredGames = computed(() => {
        const searchTerm = this.searchTerm()
        return this.games().filter(game => 
            game.title.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })
    public searchTerm = signal<string>('')
    
    updateSearch(term: string): void {
        this.searchTerm.set(term)
    }
}
```

**Service State Management:**
```typescript
@Injectable({ providedIn: 'root' })
export class GameStateService {
    private _games = signal<Array<GameType>>([])
    public games = this._games.asReadonly()
    
    private _selectedGame = signal<GameType | null>(null)
    public selectedGame = this._selectedGame.asReadonly()
    
    updateGames(games: Array<GameType>): void {
        this._games.set(games)
    }
    
    selectGame(game: GameType): void {
        this._selectedGame.set(game)
    }
}
```

## API Integration

### Type Consistency

**Keep frontend types consistent with backend DTOs:**
```typescript
// Frontend type matching backend DTO
export type GameWithTagsAndTranslationsType = GameType & {
    translations: Record<SupportedLanguage, string>
    tags: Array<{
        id: number
        name: string
        categoryName: string
    }>
}
```

### API Service Patterns

```typescript
@Injectable({ providedIn: 'root' })
export class GameApiService {
    private http = inject(HttpClient)
    
    getGames(): Observable<Array<GameType>> {
        return this.http.get<Array<GameType>>('/api/games')
    }
    
    getGameById(id: number): Observable<GameType> {
        return this.http.get<GameType>(`/api/games/${id}`)
    }
    
    updateGame(id: number, data: UpdateGameBody): Observable<GameType> {
        return this.http.put<GameType>(`/api/games/${id}`, data)
    }
    
    deleteGame(id: number): Observable<void> {
        return this.http.delete<void>(`/api/games/${id}`)
    }
}
```

## Error Handling

### Global Error Handling

```typescript
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    private notificationService = inject(NotificationService)
    
    handleError(error: Error): void {
        console.error('An error occurred:', error)
        this.notificationService.showError('Something went wrong. Please try again.')
    }
}
```

### Component Error States

```typescript
export class GameListComponent {
    public error = signal<string | null>(null)
    
    private handleError(error: any): void {
        this.error.set(error.message || 'Failed to load games')
    }
    
    retry(): void {
        this.error.set(null)
        this.loadGames()
    }
}
```

## Performance Patterns

### Lazy Loading

```typescript
const routes: Routes = [
    {
        path: 'collection',
        loadChildren: () => import('./features/collection/collection.module')
            .then(m => m.CollectionModule)
    },
    {
        path: 'play',
        loadChildren: () => import('./features/play/play.module')
            .then(m => m.PlayModule)
    }
]
```

### OnPush Change Detection

```typescript
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameCardComponent {
    @Input() game!: GameType
}
```

### Track Functions

```html
<!-- ✅ Use track functions for better performance -->
@for (game of games(); track game.id) {
    <app-game-card [game]="game" />
}
```

## Testing Patterns

### Component Testing

```typescript
describe('GameCardComponent', () => {
    let component: GameCardComponent
    let fixture: ComponentFixture<GameCardComponent>
    
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [GameCardComponent]
        }).compileComponents()
    })
    
    it('should display game title', () => {
        component.game = mockGame
        fixture.detectChanges()
        expect(fixture.nativeElement.textContent).toContain(mockGame.title)
    })
})
```

### Service Testing

```typescript
describe('GameApiService', () => {
    let service: GameApiService
    let httpMock: HttpTestingController
    
    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [GameApiService]
        })
        service = TestBed.inject(GameApiService)
        httpMock = TestBed.inject(HttpTestingController)
    })
    
    it('should fetch games', () => {
        service.getGames().subscribe(games => {
            expect(games).toEqual(mockGames)
        })
        
        const req = httpMock.expectOne('/api/games')
        req.flush(mockGames)
    })
})
```

## Key Conventions

1. **Modern Angular**: Use `@if`, `@for`, `inject()`, signals
2. **Tailwind CSS**: Use utility classes, avoid custom CSS
3. **Type Safety**: Keep types consistent with backend DTOs
4. **Component Separation**: Smart containers, dumb presentational components
5. **State Management**: Use signals for local state, services for shared state
6. **Performance**: Lazy loading, OnPush change detection, track functions
7. **Testing**: Write tests for all components and services
8. **Error Handling**: Global error handler, component error states

## Anti-Patterns to Avoid

1. ❌ **Constructor injection** when `inject()` is available
2. ❌ **Custom CSS files** when Tailwind classes suffice
3. ❌ ***ngIf and *ngFor** when @if and @for are available
4. ❌ **Observables for local state** when signals are better
5. ❌ **Inline styles** when Tailwind classes exist
6. ❌ **Manual change detection** when OnPush is available 
