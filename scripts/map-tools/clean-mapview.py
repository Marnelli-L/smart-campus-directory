#!/usr/bin/env python3
"""
Clean MapView.jsx - Remove all pathfinding logic while preserving map design
"""

import re

file_path = r"c:\smart-campus-directory\frontend\src\components\MapView.jsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Strategy: Remove specific sections line by line
new_lines = []
skip_until_line = 0

for i, line in enumerate(lines, start=1):
    # Skip if we're in a removal block
    if i < skip_until_line:
        continue
    
    # 1. Remove pathfinding import (around line 3)
    if 'import { findSimpleRoute }' in line:
        new_lines.append("// Pathfinding removed - showing markers only\n")
        continue
    
    # 2. Skip location tracking functions in useImperativeHandle (lines 40-195)
    # Keep only resetView, remove startLocationTracking and stopLocationTracking
    if i >= 40 and i <= 42 and 'startLocationTracking' in line:
        # Skip to after stopLocationTracking ends (around line 195)
        skip_until_line = 196
        # Add comment about removal
        new_lines.append("    // Location tracking functions removed - map only shows destination markers\n")
        continue
    
    # 3. Skip LIVE NAVIGATION SYSTEM block (lines 1259-1555)
    if i >= 1259 and i <= 1262 and 'LIVE NAVIGATION SYSTEM' in line:
        skip_until_line = 1556  # Skip entire navigation block
        new_lines.append("  // Live navigation system removed - simple destination markers only\n\n")
        continue
    
    # 4. Remove findSimpleRoute calls in addAnimatedRoute
    if 'findSimpleRoute(' in line:
        # Replace pathfinding logic with simple direct path
        indent = len(line) - len(line.lstrip())
        new_lines.append(' ' * indent + "// Pathfinding removed - just show destination marker\n")
        new_lines.append(' ' * indent + "pathfindingResult = {\n")
        new_lines.append(' ' * indent + "  path: [entrancePoint, destinationCoords],\n")
        new_lines.append(' ' * indent + "  distance: 0,\n")
        new_lines.append(' ' * indent + "  waypoints: 2,\n")
        new_lines.append(' ' * indent + "  valid: false, // Don't draw route line\n")
        new_lines.append(' ' * indent + "  floors: [destinationInfo.floor]\n")
        new_lines.append(' ' * indent + "};\n")
        continue
    
    # 5. Remove startLiveNavigation call
    if 'startLiveNavigation(' in line:
        indent = len(line) - len(line.lstrip())
        new_lines.append(' ' * indent + "// Live navigation removed\n")
        continue
    
    # 6. Remove unused state variables
    if any(var in line for var in ['const watchIdRef', 'const lastLocationLogRef', 
                                     'const navigationIntervalRef', 'const [routeInfo,',
                                     'const [_isNavigating,', 'const [currentUserLocation,',
                                     'const [_destinationCoords,', 'const [_remainingDistance,']):
        new_lines.append("  // " + line.lstrip())  # Comment out
        continue
    
    # Keep all other lines
    new_lines.append(line)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("✅ MapView.jsx cleaned successfully!")
print("   - Removed pathfinding import")
print("   - Removed location tracking functions")
print("   - Removed live navigation system")
print("   - Simplified routing to show markers only")
print("   - Preserved all map design (center, zoom, pitch, bearing)")
