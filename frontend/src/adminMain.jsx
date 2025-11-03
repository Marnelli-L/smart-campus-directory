import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login"; // Admin Login page
import Admin from "./pages/Admin"; // Admin Dashboard page
import "./index.css";

ReactDOM.createRoot(document.getElementById("admin-root")).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} /> {/* Admin Login route */}
        <Route path="/admin" element={<Admin />} /> {/* Admin Dashboard route */}
      </Routes>
    </Router>
  </React.StrictMode>
);