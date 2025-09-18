#!/bin/bash

# Production Migration Script
# This script runs migrations against your production database using DIRECT connection
# Run it locally after generating migration files with: bun run drizzle-kit generate

set -e

echo "🚀 Running database migrations..."

# Check if DIRECT_DATABASE_URL is set (must be port 5432 with SSL)
if [ -z "$DIRECT_DATABASE_URL" ]; then
    echo "❌ Error: DIRECT_DATABASE_URL environment variable is not set"
    echo ""
    echo "For Supabase, get your DIRECT connection string from:"
    echo "Dashboard → Settings → Database → Connection String → Direct Connection"
    echo ""
    echo "Set it like this:"
    echo "export DIRECT_DATABASE_URL='postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres?sslmode=require'"
    echo ""
    echo "⚠️  IMPORTANT: Use port 5432 (direct) not 6543 (pooled) for migrations"
    exit 1
fi

# Verify it's using the direct connection (port 5432)
if [[ ! "$DIRECT_DATABASE_URL" == *":5432/"* ]]; then
    echo "❌ Error: DIRECT_DATABASE_URL must use port 5432 for DDL operations"
    echo "Current URL uses: $(echo $DIRECT_DATABASE_URL | grep -o ':[0-9]*/' | head -1)"
    echo "Expected: :5432/"
    exit 1
fi

# Run migrations using direct connection
DATABASE_URL="$DIRECT_DATABASE_URL" bun run lib/db/migrate.ts

echo "✅ Migrations completed successfully!"
echo "Check your Supabase dashboard to verify tables were created."