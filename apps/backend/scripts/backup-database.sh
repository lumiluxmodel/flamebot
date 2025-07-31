#!/bin/bash

# Database backup script for Railway PostgreSQL
# Usage: ./backup-database.sh [type]
# Types: full, schema, data, compressed

# Database credentials
export PGPASSWORD=pyZSoGjkpyNLzYnfFgRpoHdBGVsQgkie
DB_HOST=yamabiko.proxy.rlwy.net
DB_PORT=18827
DB_NAME=railway
DB_USER=postgres

# Create backups directory if it doesn't exist
mkdir -p backups

# Get current timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Determine backup type
BACKUP_TYPE=${1:-full}

case $BACKUP_TYPE in
  "full")
    echo "🗄️ Creating full database backup..."
    FILENAME="backups/full_backup_${TIMESTAMP}.sql"
    pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > $FILENAME
    ;;
  "compressed")
    echo "🗄️ Creating compressed database backup..."
    FILENAME="backups/compressed_backup_${TIMESTAMP}.sql.gz"
    pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME | gzip > $FILENAME
    ;;
  "schema")
    echo "🏗️ Creating schema-only backup..."
    FILENAME="backups/schema_backup_${TIMESTAMP}.sql"
    pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --schema-only > $FILENAME
    ;;
  "data")
    echo "📊 Creating data-only backup..."
    FILENAME="backups/data_backup_${TIMESTAMP}.sql"
    pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --data-only > $FILENAME
    ;;
  *)
    echo "❌ Invalid backup type. Use: full, compressed, schema, or data"
    exit 1
    ;;
esac

# Check if backup was successful
if [ $? -eq 0 ]; then
    FILE_SIZE=$(du -h "$FILENAME" | cut -f1)
    echo "✅ Backup completed successfully!"
    echo "📁 File: $FILENAME"
    echo "📏 Size: $FILE_SIZE"
    
    # Show recent backups
    echo ""
    echo "📋 Recent backups:"
    ls -lah backups/ | tail -5
else
    echo "❌ Backup failed!"
    exit 1
fi