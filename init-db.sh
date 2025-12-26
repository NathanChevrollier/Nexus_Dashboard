#!/bin/sh
# init-db.sh - Script to initialize database in Docker

echo "🗄️  Initializing database..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
sleep 5

# Run migrations
echo "📦 Running migrations..."
npx drizzle-kit push --config=./drizzle.config.ts

if [ $? -eq 0 ]; then
    echo "✅ Migrations completed"
    
    # Check if admin user exists
    echo "👤 Checking for admin user..."
    # Run seed only if no users exist
    npx tsx seed.ts
    
    echo "✅ Database initialized"
else
    echo "❌ Migration failed"
    exit 1
fi
