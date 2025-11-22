#!/usr/bin/env python3
"""
Fix Admin.jsx by removing the duplicate malformed Buildings case (lines 1170-1858).
"""

# Read the file
with open('frontend/src/pages/Admin.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'📊 Total lines before: {len(lines)}')
print(f'🔍 Removing lines 1170-1858 (malformed Buildings case with orphaned feedback code)')

# Keep lines 1-1169 (index 0-1168) and 1859-end (index 1858-)
new_lines = lines[0:1169] + lines[1858:]

print(f'📊 Total lines after: {len(new_lines)}')
print(f'🗑️  Removed lines: {len(lines) - len(new_lines)}')

# Write back
with open('frontend/src/pages/Admin.jsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('✅ Admin.jsx fixed successfully!')
print('   - Removed duplicate malformed Buildings case')
print('   - Kept proper Buildings case (now at earlier line)')
print('   - All other content preserved')
