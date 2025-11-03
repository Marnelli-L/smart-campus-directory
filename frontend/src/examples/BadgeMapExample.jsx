/**
 * Example Usage of BadgeMapView Component
 * This demonstrates how to integrate the badge map view into your application
 */

import React, { useRef } from 'react';
import BadgeMapView from './components/BadgeMapView';
import BadgeLegend from './components/BadgeLegend';

function App() {
  const mapRef = useRef(null);
  const [currentMap, setCurrentMap] = React.useState(null);

  // Get map instance when component mounts
  React.useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      setCurrentMap(map);
    }
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Badge Map View */}
      <BadgeMapView ref={mapRef} />
      
      {/* Legend (pass map instance) */}
      {currentMap && <BadgeLegend map={currentMap} />}
      
      {/* Optional: Custom Controls */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: 'white',
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 1
      }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
          Smart Campus Directory
        </h1>
      </div>
    </div>
  );
}

export default App;
