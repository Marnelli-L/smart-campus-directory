// 🔧 EMERGENCY TEST COMPONENT - To verify React is working
import React from 'react';

function EmergencyTest() {
  return (
    <div style={{
      width: '100%',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div>
        <h1 style={{ margin: '0 0 20px 0', fontSize: '48px' }}>🚨</h1>
        <h2 style={{ margin: '0 0 16px 0' }}>REACT IS WORKING!</h2>
        <p style={{ margin: '0 0 16px 0' }}>This proves the component system is functional.</p>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
          If you see this, the issue is with the specific Map component, not React itself.
        </p>
      </div>
    </div>
  );
}

export default EmergencyTest;