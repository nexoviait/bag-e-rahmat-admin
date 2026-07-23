# Nexovia ERP Project Conventions

## Tech Stack
- **Backend**: Laravel (latest LTS) REST API only (no server-rendered Blade views for the app itself).
- **Database**: MySQL.
- **Authentication**: Laravel Sanctum.
- **RBAC**: Spatie `laravel-permission` for role-based access control.
- **Frontend**: React with Vite, Tailwind CSS for styling, React Query for data fetching, React Router for routing.

## API & Data Conventions
- **API Envelope**: All API responses must use Laravel API Resources and follow a consistent JSON envelope: `{ "data": ..., "meta": ... }`.
- **Financial Fields**: All money fields must be stored as integers in the database in the smallest currency unit (cents/paisa) to avoid floating point errors. Conversion to display units must be done in the frontend only.
- **Table Auditing**: Every table must have `created_at` and `updated_at` columns.
- **Soft Deletes**: All financial and employee tables must use soft deletes (`deleted_at`). Hard deletes are prohibited for these components.

## Testing Guidelines
- **Backend**: Write PHPUnit feature tests for every new API endpoint as they are developed.
- **Frontend**: Write Jest tests for all non-trivial React components.
