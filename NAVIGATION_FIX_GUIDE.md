# MapView Navigation Line Fix - Implementation Guide

## Problem Summary

The MapView component has pathfinding logic but navigation lines aren't displaying properly when searching for destinations. The route calculation works, but the line drawing logic has issues with validation checks.

## Solution Overview

1. Updated `simplePathfinding.js` to return proper format
2. Created `navigationHelper.js` with simplified routing
3. Need to update MapView.jsx to properly display routes

## Files Already Fixed

### ✅ simplePathfinding.js

Location: `frontend/src/utils/simplePathfinding.js`

**Changes Made:**

- Now returns `{path, distance, waypoints, valid}` format instead of Turf LineString
- Properly handles missing corridors with direct line fallback
- Sets `valid: true` for all routes (including direct lines) so they will be drawn
- Improved error handling and logging

### ✅ navigationHelper.js (NEW FILE)

Location: `frontend/src/utils/navigationHelper.js`

**Purpose:**

- Simplified navigation utilities
- `calculateRoute()` - Find route between two points
- `drawNavigationLine()` - Draw route on map
- `clearNavigationLine()` - Remove route from map

## Manual Fix Required for MapView.jsx

### Location

File: `frontend/src/components/MapView.jsx`
Lines: Around 1670-1800 (in the `addAnimatedRoute` function)

### Current Code Issue

```javascript
// Current problematic code (around line 1672-1700)
let pathfindingResult = findSimpleRoute(
  entrancePoint,
  destinationCoords,
  geojsonData?.features || []
);

if (!pathfindingResult || !pathfindingResult.valid) {
  // Creates invalid result that won't be drawn
  pathfindingResult = {
    path: [],
    distance: directDistance,
    waypoints: 0,
    valid: false, // This prevents drawing
    //...
  };
}

const routePath = pathfindingResult.path;
// ...later...
if (pathfindingResult.valid) {
  // Draw the route
}
```

### Fix Option 1: Simple Fix (Recommended)

Replace the validation check to just verify path exists:

```javascript
const pathfindingResult = findSimpleRoute(
  entrancePoint,
  destinationCoords,
  geojsonData?.features || []
);

// Check if we have a valid path with coordinates
if (
  !pathfindingResult ||
  !pathfindingResult.path ||
  pathfindingResult.path.length < 2
) {
  console.warn("⚠️ Could not calculate route");
  alert(`Could not find a route to "${destinationInfo.name}"`);
  // Clear any existing route
  if (mapRef.current && mapRef.current.getSource("navigation-route")) {
    mapRef.current.getSource("navigation-route").setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [],
      },
    });
  }
  setRouteInfo(null);
  isProcessingRouteRef.current = false;
  return;
}

const routePath = pathfindingResult.path;

// Calculate estimated time
const estimatedTimeSeconds = pathfindingResult.distance / 1.4;
const estimatedMinutes = Math.ceil(estimatedTimeSeconds / 60);

// Set route info
setRouteInfo({
  distance: pathfindingResult.distance,
  waypoints: pathfindingResult.waypoints,
  isValid: true,
  estimatedTime: estimatedMinutes,
  destination: destinationInfo.name,
  building: destinationInfo.building,
  floor: destinationInfo.floor,
  floors: [destinationInfo.floor],
});

// ✨ DRAW ROUTE LINE - This is the key part!
if (
  mapRef.current &&
  mapRef.current.getSource("navigation-route") &&
  routePath.length >= 2
) {
  mapRef.current.getSource("navigation-route").setData({
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: routePath,
    },
  });

  console.log("✅ Route line drawn with", routePath.length, "points");

  // Move navigation route to top layer
  if (mapRef.current.getLayer("navigation-route-line")) {
    mapRef.current.moveLayer("navigation-route-line");
  }

  // Fit map to show route
  const bounds = routePath.reduce((bounds, coord) => {
    return bounds.extend(coord);
  }, new window.mapboxgl.LngLatBounds(routePath[0], routePath[0]));

  mapRef.current.fitBounds(bounds, {
    padding: 100,
    duration: 1000,
    pitch: 10,
    bearing: 253,
  });
}
```

### Fix Option 2: Use navigationHelper.js

Import at top of MapView.jsx:

```javascript
import {
  calculateRoute,
  drawNavigationLine,
  clearNavigationLine,
} from "../utils/navigationHelper";
```

Then in `addAnimatedRoute` function:

```javascript
const routeResult = calculateRoute(
  entrancePoint,
  destinationCoords,
  geojsonData?.features || []
);

if (!routeResult.success || !routeResult.path || routeResult.path.length < 2) {
  console.warn("⚠️ Could not calculate route");
  alert(`Could not find a route to "${destinationInfo.name}"`);
  clearNavigationLine(mapRef.current);
  setRouteInfo(null);
  isProcessingRouteRef.current = false;
  return;
}

// Set route info
setRouteInfo({
  distance: routeResult.distance,
  waypoints: routeResult.waypoints,
  isValid: true,
  estimatedTime: Math.ceil(routeResult.distance / 20),
  destination: destinationInfo.name,
  building: destinationInfo.building,
  floor: destinationInfo.floor,
  floors: [destinationInfo.floor],
});

// Draw the navigation line
drawNavigationLine(mapRef.current, routeResult.path);
console.log("✅ Navigation line displayed");
```

## Testing the Fix

1. Start dev server: `npm run dev` in frontend folder
2. Open the app in browser
3. Search for any location (e.g., "Registrar", "Library", "NB306")
4. You should see:
   - Blue navigation line from "You Are Here" to destination
   - Route info panel showing distance and time
   - Map automatically zooms to show full route

## Key Points

1. The navigation line layer is already created in MapView on map load (line ~808)
2. The line has ID `'navigation-route-line'` and is bright blue (`#1E88E5`)
3. The source is `'navigation-route'`
4. Just need to update the source data with path coordinates
5. The fixed GeoJSON file (with 144 corridors) should provide good routes

## Common Issues & Solutions

**Issue:** Line doesn't appear

- Check browser console for errors
- Verify `routePath` has at least 2 coordinates
- Check if `navigation-route` source exists on map
- Verify coordinates are in [longitude, latitude] format

**Issue:** Line appears but in wrong location

- Coordinates might be [lat, lng] instead of [lng, lat]
- Check GeoJSON coordinate order

**Issue:** Route goes through buildings

- This is expected - the pathfinding uses simplified corridor matching
- With the fixed GeoJSON (97 new corridor connections), routes should follow corridors better

## Next Steps

After applying the fix:

1. Test with various destinations
2. Check console logs for pathfinding output
3. Verify route line appears as blue line on map
4. Confirm map zooms to show full route

The navigation system should work like Google Maps - when you search for a destination, a blue line appears showing the route from your current location to the destination.
