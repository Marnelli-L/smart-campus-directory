-- Drop the table if it exists (be careful in production!)
DROP TABLE IF EXISTS announcements CASCADE;

-- Create announcements table
CREATE TABLE announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'General',
  tags TEXT[],
  publish_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expire_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100) DEFAULT 'Admin',
  status VARCHAR(20) DEFAULT 'Active',
  priority VARCHAR(20) DEFAULT 'Normal'
);

-- Create indexes for better performance
CREATE INDEX idx_announcements_publish_date ON announcements(publish_date DESC);
CREATE INDEX idx_announcements_status ON announcements(status);
CREATE INDEX idx_announcements_category ON announcements(category);

-- Insert sample announcements (optional - you can remove these if you want to start fresh)
INSERT INTO announcements (title, content, category, tags, publish_date, expire_date, status, priority, created_by) 
VALUES 
  (
    'Welcome Event',
    'Join us for the campus welcome.',
    'Events',
    ARRAY['event', 'welcome'],
    CURRENT_TIMESTAMP,
    NULL,
    'Active',
    'Normal',
    'Admin'
  ),
  (
    'Library Hours',
    'Extended hours this week.',
    'Services',
    ARRAY['library', 'hours'],
    CURRENT_TIMESTAMP,
    NULL,
    'Active',
    'Normal',
    'Admin'
  );

-- Verify the table was created
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'announcements'
ORDER BY ordinal_position;

-- Display all announcements
SELECT * FROM announcements ORDER BY publish_date DESC;
