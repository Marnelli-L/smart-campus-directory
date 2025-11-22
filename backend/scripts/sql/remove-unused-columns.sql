-- Migration: Remove unused columns from buildings and announcements tables
-- Run this on your production database (Render PostgreSQL)

-- Remove 'contact' and 'announcement' columns from buildings table
ALTER TABLE buildings 
DROP COLUMN IF EXISTS contact,
DROP COLUMN IF EXISTS announcement;

-- Remove 'title' and 'tags' columns from announcements table
ALTER TABLE announcements
DROP COLUMN IF EXISTS title,
DROP COLUMN IF EXISTS tags;

-- Verify the changes
-- Check buildings table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'buildings'
ORDER BY ordinal_position;

-- Check announcements table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'announcements'
ORDER BY ordinal_position;
