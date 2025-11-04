// Quick Navigation Line Fix for MapView.jsx
// Add this import at the top of MapView.jsx (around line 3-4):
import { calculateRoute, drawNavigationLine } from '../utils/navigationHelper';

// Then find the addAnimatedRoute function (around line 1670) and replace the pathfinding section:

// REPLACE THIS SECTION (around lines 1672-1750):
/*
      // STRICT MODE: Only use corridor pathfinding - no direct line fallbacks
      console.log('🔄 Running corridor-based pathfinding (strict mode)...');
      let pathfindingResult = findSimpleRoute(entrancePoint, destinationCoords, geojsonData?.features || []);
      
      if (!pathfindingResult || !pathfindingResult.valid) {
        console.warn('⚠️ No valid corridor path found');
        console.log('❌ Route will NOT be drawn - strict corridor-only mode');
        
        // Create result with valid: false - route will not be drawn
        const dx = destinationCoords[0] - entrancePoint[0];
        const dy = destinationCoords[1] - entrancePoint[1];
        const directDistance = Math.sqrt(dx*dx + dy*dy) * 111320;
        
        pathfindingResult = {
          path: [],
          distance: directDistance,
          waypoints: 0,
          valid: false, // Route will NOT be drawn
          floors: [destinationInfo.floor],
          error: 'No corridor connection available - corridors must connect start and destination'
        };
        
        console.log('%c⚠️ No corridor route available:', 'background: #FF9800; color: white; font-size: 12px; padding: 4px;', 
          'Destination cannot be reached via corridors');
      } else {
        console.log('%c✅ Corridor route found:', 'background: #4CAF50; color: white; font-size: 12px; padding: 4px;', 
          `${pathfindingResult.distance.toFixed(1)}m, ${pathfindingResult.waypoints} waypoints - follows corridors only`);
      }
      
      const routePath = pathfindingResult.path;
      
      // Calculate estimated walking time (average walking speed: 1.4 m/s)
      const estimatedTimeSeconds = pathfindingResult.distance / 1.4;
      const estimatedMinutes = Math.ceil(estimatedTimeSeconds / 60);
      
      setRouteInfo({
        distance: pathfindingResult.distance,
        waypoints: pathfindingResult.waypoints,
        isValid: pathfindingResult.valid,
        estimatedTime: estimatedMinutes,
        destination: destinationInfo.name,
        building: destinationInfo.building,
        floor: destinationInfo.floor,
        floors: pathfindingResult.floors || [destinationInfo.floor],
        isMultiFloor: pathfindingResult.isMultiFloor || false,
        floorTransitions: pathfindingResult.floorTransitions || []
      });
      
      if (pathfindingResult.valid) {
*/

// WITH THIS NEW CODE:
      // 🗺️ Calculate route using navigation helper
      console.log('🗺️ Calculating route...');
      const routeResult = calculateRoute(entrancePoint, destinationCoords, geojsonData?.features || []);
      
      if (!routeResult.success || !routeResult.path || routeResult.path.length < 2) {
        console.warn('⚠️ Could not calculate route');
        isProcessingRouteRef.current = false;
        return;
      }
      
      console.log('✅ Route found:', routeResult.distance.toFixed(1), 'm');
      
      const routePath = routeResult.path;
      
      // Set route information
      setRouteInfo({
        distance: routeResult.distance,
        waypoints: routeResult.waypoints,
        isValid: true,
        estimatedTime: Math.ceil(routeResult.distance / 20), // ~20m per second walking speed
        destination: destinationInfo.name,
        building: destinationInfo.building,
        floor: destinationInfo.floor,
        floors: [destinationInfo.floor],
        isMultiFloor: false
      });
      
      // ✨ DRAW THE NAVIGATION LINE - This is the key part!
      if (mapRef.current && routePath && routePath.length >= 2) {
// END OF REPLACEMENT

// The drawing code should already be there, but make sure it looks like this:
        drawNavigationLine(mapRef.current, routePath);
        console.log('✅ Navigation line drawn with', routePath.length, 'points');
        
        // Start live navigation
        startLiveNavigation(destinationCoords, destinationInfo);
      }
// Continue with rest of code...

