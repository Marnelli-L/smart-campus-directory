-- Migration: Remove website column from directories table
-- Since UDM only has one website, this field is unnecessary

-- Remove the website column
ALTER TABLE directories DROP COLUMN IF EXISTS website;

-- Confirm the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'directories' 
ORDER BY ordinal_position;
