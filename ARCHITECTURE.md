# Architecture Overview

## Design Principles
1. **Separation of Concerns**: Logic is separated into services, UI is separated into components.
2. **Centralized Constants**: All strings like roles and departments are managed in `@/constants`.
3. **Aliased Pathing**: Use `@/` for clean imports.
4. **Modular Services**: Each module (Auth, HR, Inventory) has its own service to handle data operations.

## Data Flow
- User interacts with the UI.
- UI calls a `Service` (e.g., `hrService`).
- Service communicates with `Supabase` via `@/core/supabase`.
- Service returns data to the UI.
- UI updates using reusable `Components`.

## Authentication
- Handled by `authService`.
- Uses `localStorage` for session management.
- Redirects are centralized in `authService.getRedirectUrl()`.
