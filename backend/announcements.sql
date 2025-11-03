-- Announcements table with proper structure for icons, categories, and scheduling
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'General',
  icon VARCHAR(100) NOT NULL DEFAULT 'bell',
  tags TEXT[],
  publish_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expire_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100),
  status VARCHAR(20) DEFAULT 'Active',
  priority VARCHAR(20) DEFAULT 'Normal'
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_announcements_publish_date ON announcements(publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_category ON announcements(category);

-- Insert sample announcements
INSERT INTO announcements (title, content, category, icon, tags, publish_date, expire_date, status, priority, created_by) 
VALUES 
  (
    'Clinic Maintenance Notice',
    'The clinic will be under maintenance from August 18th to August 20th.',
    'Maintenance',
    'wrench',
    ARRAY['maintenance', 'clinic', 'important'],
    NOW(),
    NOW() + INTERVAL '4 days',
    'Active',
    'High',
    'Admin'
  ),
  (
    'Welcome to Campus',
    'Join us for the campus welcome event. Great opportunity to meet fellow students and staff.',
    'Events',
    'calendar',
    ARRAY['event', 'welcome', 'students'],
    NOW(),
    NOW() + INTERVAL '30 days',
    'Active',
    'Normal',
    'Admin'
  ),
  (
    'Library Extended Hours',
    'The library will have extended hours this week. Open until 10 PM daily.',
    'Services',
    'book-open',
    ARRAY['library', 'hours', 'services'],
    NOW(),
    NOW() + INTERVAL '7 days',
    'Active',
    'Normal',
    'Admin'
  );

-- Query to retrieve all active announcements
SELECT 
  id,
  title,
  content,
  category,
  icon,
  tags,
  publish_date as date,
  expire_date,
  status,
  priority
FROM announcements
WHERE status = 'Active' 
  AND publish_date <= CURRENT_TIMESTAMP
  AND (expire_date IS NULL OR expire_date > CURRENT_TIMESTAMP)
ORDER BY priority DESC, publish_date DESC;
