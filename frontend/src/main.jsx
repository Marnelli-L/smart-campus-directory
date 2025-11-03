import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import App from "./App";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute"; // Import ProtectedRoute
import "./index.css";

// Service Worker completely disabled to prevent caching issues during development
console.log('🚫 Service Worker disabled - no caching during development');

// Also unregister any existing service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister().then(() => {
        console.log('🗑️ Unregistered existing service worker');
      });
    }
  });
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
