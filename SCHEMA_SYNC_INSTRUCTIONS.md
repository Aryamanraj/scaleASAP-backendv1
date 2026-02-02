# Schema Synchronization Instructions

## Problem
The current migration 000 doesn't include all columns/tables from the evolved entity definitions, causing errors on fresh database installations.

## Solution: Auto-generate migration 000 from current entities

### Step 1: Create a temporary database and generate schema

```bash
# Set environment to use schema sync
export NODE_ENV=development
export DB_SYNC=true
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=your_password
export POSTGRES_DB=temp_schema_gen

# Create temporary database
createdb temp_schema_gen

# Temporarily disable migration service (rename migrations folder)
mv migrations migrations_backup

# Start the app - TypeORM will create all tables
npm run start:dev

# Wait for app to start successfully, then stop it (Ctrl+C)
```

### Step 2: Export the schema

```bash
# Export only the schema (no data) as SQL
pg_dump -h localhost -U postgres -d temp_schema_gen \
  --schema-only \
  --no-owner \
  --no-privileges \
  --no-tablespaces \
  --no-security-labels \
  --no-comments \
  > migrations/000_initial_schema_new.sql

# Clean up
dropdb temp_schema_gen
mv migrations_backup migrations
```

### Step 3: Clean up the exported SQL

The exported SQL will need manual cleanup:
- Remove the Migrations table (auto-created by MigrationService)
- Remove any unwanted COMMENT lines
- Ensure proper formatting
- Test the new migration on a fresh database

### Step 4: Replace migration 000

```bash
# Backup old migration
mv migrations/000_initial_schema.sql migrations/000_initial_schema_old.sql

# Use the new one
mv migrations/000_initial_schema_new.sql migrations/000_initial_schema.sql

# Test on fresh database
createdb test_fresh_migration
# Run your app against test_fresh_migration
# Verify all migrations run successfully
dropdb test_fresh_migration
```

## Alternative: Quick Fix (Current Approach)

Instead of regenerating the entire schema, we can:
1. Add missing columns to migration 000 as we encounter errors
2. This maintains backward compatibility but requires iterative fixes

Current fixes applied:
- Added "Slug" column to Clients table
- Added "SupabaseUserID" column to Users table
