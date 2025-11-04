# Pathfinding Debug Guide

## Overview

Enhanced debugging has been added to diagnose why pathfinding route lines aren't displaying on the map.

## What Was Added

### 1. Pathfinding Debug Utility (`frontend/src/utils/pathfindingDebug.js`)

A comprehensive debugging tool that provides:

- **debugPathfinding()**: Shows complete pathfinding statistics

  - Total nodes and edges in the graph
  - Sample nodes with coordinates
  - Edge statistics (total, average per node, min/max)
  - GeoJSON feature breakdown (LineStrings, Points, Polygons)
  - Sample corridor information

- **testPathfinding()**: Tests a specific route
  - Shows start and end coordinates
  - Displays result validity, distance, waypoints
  - Shows path point count and first/last coordinates

### 2. Enhanced Console Logging in MapView.jsx

#### At Initialization (Line ~413)

```javascript
// When GeoJSON loads and pathfinding initializes
import("../utils/pathfindingDebug.js").then(({ debugPathfinding }) => {
  debugPathfinding(corridorPathfinder, data);
});
```

**What to Look For:**

- `=== PATHFINDING DEBUG INFO ===` section
- Total Nodes count (should be > 0)
- Total Edges count (should be > 0)
- LineStrings count (should match GeoJSON file)

#### At Route Creation (Line ~1111)

```javascript
// When user searches for a destination
import("../utils/pathfindingDebug.js").then(({ testPathfinding }) => {
  testPathfinding(corridorPathfinder, entrancePoint, destinationCoords);
});
```

**What to Look For:**

- `🧪 RUNNING PATHFINDING TEST` section
- `Valid: true` (if false, pathfinding failed)
- `Path Points: N` where N > 0

#### At Route Drawing Decision (Line ~1185)

```javascript
// Critical decision point
console.log("🔍 ROUTE DRAWING DECISION POINT");
console.log("  pathfindingResult.valid:", pathfindingResult.valid);
console.log("  routePath exists:", !!routePath);
console.log("  routePath.length:", routePath?.length);
console.log(
  "  Will draw route:",
  pathfindingResult.valid && routePath && routePath.length > 1
);
```

**What to Look For:**

- All three conditions must be true:
  1. `pathfindingResult.valid: true`
  2. `routePath exists: true`
  3. `routePath.length: > 1`
- Look for `✅ CALLING animateRouteLine` (good) or `❌ NOT CALLING animateRouteLine` (problem)

#### At Route Animation (Line ~1505)

```javascript
// When route is actually drawn
function animateRouteLine(pathCoords, metadata = {}) {
  console.log('🎨 ANIMATE ROUTE LINE CALLED');
  console.log('📍 Number of coordinates:', pathCoords?.length);
```

**What to Look For:**

- `🎨 ANIMATE ROUTE LINE CALLED` message
- Coordinates array with length > 0
- `✅ Valid coordinates, proceeding to draw route...`

## How to Debug

### Step 1: Check Browser Console

1. Open the application at http://localhost:5175/
2. Open Browser DevTools (F12)
3. Go to Console tab
4. Clear console

### Step 2: Load the Map

1. Navigate to the Map page
2. Look for the initialization debug output:
   ```
   === PATHFINDING DEBUG INFO ===
   📊 Total Nodes: [number]
   📊 Total Edges: [number]
   ```

**Expected Values:**

- Ground Floor: ~90-100 nodes, ~400-500 edges
- 2nd Floor: ~66 nodes, ~300-400 edges
- 3rd Floor: ~82 nodes, ~400-500 edges
- 4th Floor: ~70 nodes, ~300-400 edges

**If nodes/edges are 0:**

- GeoJSON not loading correctly
- LineStrings missing from GeoJSON
- Graph creation failing in corridorPathfinding.js

### Step 3: Search for a Destination

1. Search for any location (e.g., "Library")
2. Watch console for these key sections:

#### A. Pathfinding Test

```
🧪 RUNNING PATHFINDING TEST
Start: [120.981635, 14.591638]
End: [120.xxxxx, 14.xxxxx]
Result:
  Valid: true/false
  Distance: XX.XXm
  Path Points: XX
```

**If Valid: false**

- Start or end point too far from corridor nodes (>6m threshold)
- No path exists between start and end
- Graph not connected properly

#### B. Pathfinding Result

```
🔍 PATHFINDING RESULT:
🔍 Result valid: true/false
🔍 Result path length: XX
```

**If path length is 0:**

- A\* algorithm failed to find route
- Start/end nodes not in same connected component

#### C. Route Drawing Decision

```
🔍 ROUTE DRAWING DECISION POINT
  pathfindingResult.valid: true/false
  routePath exists: true/false
  routePath.length: XX
  Will draw route: true/false
```

**If "Will draw route: false":**

- Check which condition failed
- This is why route isn't appearing on map

#### D. Route Animation Call

```
🎨 ANIMATE ROUTE LINE CALLED
📍 Number of coordinates: XX
✅ Valid coordinates, proceeding to draw route...
```

**If this doesn't appear:**

- Route drawing was skipped (check decision point above)

**If this appears but no route visible:**

- Mapbox layer issue (z-index, color, opacity)
- Source not added correctly
- Map style not loaded

## Common Issues & Solutions

### Issue 1: Nodes/Edges are 0

**Cause:** GeoJSON not loading or no LineStrings found

**Solution:**

1. Check network tab for GeoJSON file load
2. Verify GeoJSON file exists in `frontend/public/images/`
3. Check GeoJSON structure has `features` array with `LineString` geometries

### Issue 2: Valid is false

**Cause:** Start/end coordinates too far from any corridor node

**Solution:**

1. Check entrance point coordinates: `[120.981635, 14.591638]`
2. Check destination coordinates in fallback list
3. Increase proximity threshold in corridorPathfinding.js (currently 6m)
4. Add more corridor LineStrings near entrance/destinations

### Issue 3: Path length is 0

**Cause:** A\* algorithm couldn't find route

**Solution:**

1. Verify corridors connect entrance to destination
2. Check for disconnected graph components
3. Add connecting corridors in GeoJSON
4. Verify edge creation in buildGraphWithTurf()

### Issue 4: Route not visible but animation called

**Cause:** Mapbox rendering issue

**Solution:**

1. Check map style is loaded: `mapRef.current.isStyleLoaded()`
2. Verify route layers are added (route-glow, route-line, etc.)
3. Check z-index/layering (route should be above base map)
4. Verify line color is visible: `#00695C` (teal)
5. Check line width: 6px (should be visible)

## Testing Checklist

- [ ] Console shows "=== PATHFINDING DEBUG INFO ===" on map load
- [ ] Total Nodes > 0
- [ ] Total Edges > 0
- [ ] LineStrings count matches expected (45 for ground floor)
- [ ] Search for destination triggers "🧪 RUNNING PATHFINDING TEST"
- [ ] Pathfinding result shows Valid: true
- [ ] Path Points count > 0
- [ ] Decision point shows "Will draw route: true"
- [ ] "🎨 ANIMATE ROUTE LINE CALLED" appears
- [ ] Route line is visible on map

## Expected Console Output (Success)

```
=== PATHFINDING DEBUG INFO ===
📊 Total Nodes: 90
📊 Total Edges: 450
📍 Sample Nodes:
  Node n_120.981635_14.591638: [120.981635, 14.591638] (Floor: ground)
  ...
🔗 Edge Statistics:
  Total Edges: 450
  Average Edges per Node: 5.00
  ...
📐 GeoJSON Features:
  LineStrings (Corridors): 45
  Points (Locations): 120
  Polygons (Buildings): 15
=== END DEBUG INFO ===

[User searches for "Library"]

🧪 RUNNING PATHFINDING TEST
Start: [120.981635, 14.591638]
End: [120.982015, 14.591820]
Result:
  Valid: true
  Distance: 142.50m
  Waypoints: 8
  Path Points: 45

🔍 PATHFINDING RESULT:
🔍 Result valid: true
🔍 Result path length: 45
✅ PATH EXISTS - Should draw route on map

🔍 ROUTE DRAWING DECISION POINT
  pathfindingResult.valid: true
  routePath exists: true
  routePath.length: 45
  Will draw route: true

✅ CALLING animateRouteLine

🎨 ANIMATE ROUTE LINE CALLED
📍 Number of coordinates: 45
✅ Valid coordinates, proceeding to draw route...
✅ Map style loaded, creating animated route
```

## Next Steps if Still Not Working

1. **Export Graph Data:** Add code to export the full node-edge graph to JSON for inspection
2. **Visualize Nodes:** Draw all nodes as markers on map to verify locations
3. **Visualize Edges:** Draw all edges as lines to see corridor network
4. **Step-by-Step A\*:** Log each step of A\* algorithm execution
5. **Check Turf.js:** Verify Turf.js distance calculations are working
6. **Manual Route Test:** Hardcode a simple 2-point route to test rendering

## Development Server

```bash
cd frontend
npm run dev
# Opens at http://localhost:5175/
```

## Files Modified

- `frontend/src/utils/pathfindingDebug.js` (NEW)
- `frontend/src/components/MapView.jsx` (enhanced logging)
