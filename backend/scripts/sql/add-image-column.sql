-- Quick Update Script for Adding Image Column
-- Run this if you want to keep existing data

-- Add the image column to existing directories table
ALTER TABLE directories ADD COLUMN IF NOT EXISTS image VARCHAR(500);

-- Verify the column was added
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'directories' 
ORDER BY ordinal_position;
