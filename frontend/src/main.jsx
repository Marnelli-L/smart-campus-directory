import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import App from "./App";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute"; // Import ProtectedRoute
import "./index.css";

// Register Service Worker for offline functionality
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('✅ Service Worker registered successfully:', registration.scope);
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('🔄 Service Worker update found');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available, prompt user to refresh
            console.log('🆕 New version available! Please refresh.');
            
            // Show update notification
            if (window.confirm('A new version is available! Click OK to update.')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        });
      });
      
      // Handle updates
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
      
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  });
} else {
  console.log('🚫 Service Worker not registered (development mode or not supported)');
}

// eslint-disable-next-line react-refresh/only-export-components
const Main = () => {
    // Track admin authentication with localStorage persistence
    const [isAuthenticated, setIsAuthenticated] = React.useState(() => {
        const storedAuth = localStorage.getItem('adminAuthenticated');
        const hasToken = localStorage.getItem('adminToken');
        
        // Verify both flags exist for authentication
        return storedAuth === 'true' && hasToken;
    });

    // Update localStorage when authentication changes
    React.useEffect(() => {
        if (isAuthenticated) {
            localStorage.setItem('adminAuthenticated', 'true');
            console.log('✅ Admin authenticated');
        } else {
            // Clear all auth data on logout
            localStorage.removeItem('adminAuthenticated');
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            console.log('🚪 Admin logged out');
        }
    }, [isAuthenticated]);
    
    // Session validation on mount
    React.useEffect(() => {
        const validateSession = () => {
            const hasAuth = localStorage.getItem('adminAuthenticated') === 'true';
            const hasToken = localStorage.getItem('adminToken');
            
            if (hasAuth && !hasToken) {
                console.warn('⚠️ Invalid session detected - missing token');
                setIsAuthenticated(false);
            }
        };
        
        validateSession();
    }, []);

    return (
        <React.StrictMode>
            <Router>
                <Routes>
                    <Route path="/*" element={<App />} /> {/* Main Interface */}
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <Admin setIsAuthenticated={setIsAuthenticated} />
                            </ProtectedRoute>
                        }
                    /> {/* Admin Dashboard */}
                    <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} /> {/* Admin Login */}
                </Routes>
            </Router>
        </React.StrictMode>
    );
};

ReactDOM.createRoot(document.getElementById("root")).render(<Main />);
