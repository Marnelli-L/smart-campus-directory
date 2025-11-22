import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ isAuthenticated, children }) => {
  // Check if running on localhost (development environment)
  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname === '';
  
  // In localhost, bypass authentication for testing
  // In production (Vercel, live site), require authentication
  if (!isAuthenticated && !isLocalhost) {
    return <Navigate to="/login" />;
  }
  
  // Allow access if authenticated OR running on localhost
  return children;
};

export default ProtectedRoute;