# Database Migration Guide

## What Changed?

You removed the following fields from your forms:

- **Buildings/Directory**: `contact` and `announcement` fields
- **Announcements**: `title` and `tags` fields

These columns need to be removed from your hosted database.

## Migration Steps

### Option 1: Using Node.js Script (Recommended)

1. **Make sure you have your environment variables set** in `backend/.env`:

   ```env
   DATABASE_URL=your_render_postgres_connection_string
   NODE_ENV=production
   ```

2. **Run the migration script**:

   ```bash
   cd backend
   node scripts/migrate-database.js
   ```

3. **Verify the output** - You should see:
   ```
   ✅ Migration completed successfully!
   🎉 Database is now up to date!
   ```

### Option 2: Using SQL Directly (Render Dashboard)

1. **Go to your Render Dashboard**:
   - Navigate to your PostgreSQL database
   - Click "Connect" → "PSQL Command"
   - Or use the web shell

2. **Run this SQL**:

   ```sql
   -- Remove unused columns
   ALTER TABLE buildings
   DROP COLUMN IF EXISTS contact,
   DROP COLUMN IF EXISTS announcement;

   ALTER TABLE announcements
   DROP COLUMN IF EXISTS title,
   DROP COLUMN IF EXISTS tags;
   ```

3. **Verify the changes**:

   ```sql
   -- Check buildings structure
   \d buildings

   -- Check announcements structure
   \d announcements
   ```

## Verification

After migration, verify your tables have the correct structure:

### Buildings Table (should have):

- ✅ id
- ✅ name
- ✅ location
- ✅ email
- ✅ website
- ✅ staff
- ✅ office_hours
- ✅ category
- ✅ status
- ✅ image
- ✅ latitude, longitude
- ✅ type, description
- ✅ created_at, updated_at
- ❌ ~~contact~~ (removed)
- ❌ ~~announcement~~ (removed)

### Announcements Table (should have):

- ✅ id
- ✅ content
- ✅ category
- ✅ icon
- ✅ publish_date
- ✅ expire_date
- ✅ status
- ✅ priority
- ✅ created_by
- ✅ created_at, updated_at
- ❌ ~~title~~ (removed)
- ❌ ~~tags~~ (removed)

## Rollback (If Needed)

If something goes wrong and you need to restore the columns:

```sql
-- Restore buildings columns
ALTER TABLE buildings
ADD COLUMN contact VARCHAR(100),
ADD COLUMN announcement TEXT DEFAULT '';

-- Restore announcements columns
ALTER TABLE announcements
ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT 'Untitled',
ADD COLUMN tags TEXT[];
```

## Important Notes

⚠️ **Backup First**: Always backup your database before running migrations
⚠️ **Run Once**: This migration should only be run once
⚠️ **Check Backend Code**: Make sure your backend API routes don't reference these columns
⚠️ **Test Locally**: Test on a local database first if possible

## After Migration

1. ✅ Test creating new announcements
2. ✅ Test creating new directory entries
3. ✅ Test editing existing records
4. ✅ Verify no errors in your Render logs
5. ✅ Check that the admin interface works correctly

## Support

If you encounter issues:

1. Check Render logs for database errors
2. Verify your DATABASE_URL is correct
3. Ensure you have proper database permissions
4. Contact your hosting provider if needed
