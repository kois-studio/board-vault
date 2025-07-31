# Frontend Structure & Navigation

This document describes the user interface structure, navigation flow, and technical architecture of the BoardVault Angular 19 application.

## Technical Stack

- **Framework**: Angular 19 with latest syntax
- **Styling**: Tailwind CSS (utility-first approach)
- **State Management**: Angular Signals and RxJS Observables
- **Build Tool**: Angular CLI with Vite
- **Testing**: Jasmine/Karma for unit tests, Cypress for E2E

## Application Architecture

### Project Structure
```
src/
├── app/
│   ├── api/                    # Connection to backend
│   │   ├── api.ts/             # All endpoint calls go here
│   │   └── api.types.ts/       # Response types for each 
│   │
│   ├── components/             # Reusable UI components
│   │   ├── ui/                 # non project-specific components: buttons, cards, modals, etc.
│   │   └── */                  # project-specific components: can contain business logic, but should be reusable.
│   │
│   ├── pages/                  # Pages - components without a selector. Only accessible through router. Should not contain business logic, just to compose components.
│   │   ├── dashboard/          # Dashboard page - main page after login
│   │   └── admin/              # Admin page - only accessible to admin users
│   │
│   ├── core/                   # Core functionality
│   │   ├── enums/              # Enums
│   │   ├── guards/             # Route guards
│   │   ├── interceptors/       # HTTP interceptors
│   │   ├── pipes/              # Custom pipes
│   │   ├── services/           # Custom services
│   │   ├── types/              # Custom types
│   │   ├── utils/              # Custom utils
│   │   ├── validators/         # Custom validators
│   │   └── directives/         # Custom directives
│   │
│   ├── layout/                 # Layout components
│   │   ├── header/             # Header component
│   │   ├── sidebar/            # Sidebar component
│   │   └── toast/              # Toast component
│   │
│   ├── modules/               # Not real angular modules (all is standalone), just to group components.
│   │   └── admin/             # Admin functionality - since it is so isolated, we group all here.
│   │
│   └── app.component.ts
│
└── environments/
```

## Main Application Structure

The frontend application is organized into 3 main sections, each with its own sub-sections and features:

### 1. Dashboard
The main landing page after login, providing an overview of the user's gaming activity.

**Main Features:**
- **My Groups**: List of groups the user is a member of
  - Group management interface
  - Member list and permissions
  - Group activity feed

**Additional Blocks:**
- **Recent Activity**: Feed showing recent actions from group members
- **Quick Actions**: Shortcuts to common tasks
- **Notifications**: System and group notifications

### 2. Collection
A comprehensive game collection management interface organized in a 2x2 grid layout.

**Main Blocks:**
- **My Games**: Complete list of owned games
  - Game details and metadata
  - Collection statistics
  - Game management tools

- **Browse and Discover**: Game discovery interface
  - Search and filter functionality
  - Game recommendations
  - Add games to collection

- **Wishlist**: Games the user wants to acquire
  - Priority management
  - Price tracking
  - Purchase planning

- **Reviews**: User's game reviews and ratings
  - Review management
  - Rating history
  - Review analytics

**Additional Features:**
- Collection activity notifications
- Game addition alerts
- Review activity feed

### 3. Play
Game session planning and tracking interface, also organized in a 2x2 grid.

**Main Blocks:**
- **My Meets**: Scheduled gaming sessions
  - Meet creation and management
  - Participant coordination
  - Session planning tools

- **Game Recommendations**: AI-powered game suggestions
  - Player count optimization
  - Time-based recommendations
  - Group preference matching

- **Play History**: Record of past gaming sessions
  - Session details and outcomes
  - Game play statistics
  - Historical data analysis

- **Play Statistics**: Comprehensive gaming analytics
  - Personal gaming metrics
  - Group performance data
  - Trend analysis

## Navigation Patterns

### Block-Based Layout
The application uses a consistent block-based layout system:
- **Dashboard**: Single column with multiple blocks
- **Collection & Play**: 2x2 grid layout for main features
- **Responsive**: Adapts to different screen sizes using Tailwind breakpoints

### Cross-Section Integration
- Notifications appear across all sections
- Quick actions available from any page
- Consistent navigation patterns throughout
- Shared header and sidebar components

### Data Flow
- Real-time updates for group activities
- Synchronized data across all sections
- Consistent state management using signals

## Technical Implementation Standards

### Modern Angular 19 Syntax
- Use `@if` instead of `*ngIf`
- Use `@for` instead of `*ngFor`
- Use `inject()` instead of constructor injection
- Use signals for reactive state management

### Tailwind CSS Approach
- Use utility classes exclusively
- Avoid custom CSS/SCSS files unless necessary
- Only use SCSS for complex animations or very specific styling
- Keep `styles.scss` minimal for global styles only

### Component Architecture
- Smart components (containers) for business logic
- Dumb components (presentational) for UI
- Feature-based module organization
- Lazy loading for all feature modules

### State Management
- Angular signals for local component state
- RxJS observables for API communication
- Service-based state for shared data
- OnPush change detection strategy

## Responsive Design

### Breakpoint Strategy
- Mobile-first approach
- Tailwind breakpoints: `sm`, `md`, `lg`, `xl`, `2xl`
- Flexible grid system using CSS Grid and Flexbox
- Touch-friendly interactions for mobile devices

### Layout Adaptations
- Dashboard: Single column on mobile, multi-column on desktop
- Collection/Play: 1x4 grid on mobile, 2x2 grid on desktop
- Navigation: Collapsible sidebar on mobile, fixed sidebar on desktop
- Cards: Stack vertically on mobile, grid layout on desktop
