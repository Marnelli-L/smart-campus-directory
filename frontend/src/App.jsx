import "./index.css";
import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./context/LanguageContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { PageLoader } from "./components/LoadingSkeleton";

// Immediate imports (used on first page load)
import Header from "./components/Header";
import LioButton from "./components/LioButton";
import Announcements from "./components/Announcements";
import OfflineIndicator from "./components/OfflineIndicator";
import Home from "./pages/Home";

// Lazy-loaded routes (loaded on demand)
const Map = lazy(() => import("./pages/Map"));
const Feedback = lazy(() => import("./pages/Feedback"));
const ReportIssues = lazy(() => import("./pages/ReportIssues"));
const MobileVersion = lazy(() => import("./pages/MobileVersion"));
const Directory = lazy(() => import("./pages/Directory"));
const FeedbackReport = lazy(() => import("./pages/FeedbackReport"));

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <OfflineIndicator />
        <Header />
        <Announcements />
        <LioButton />
        <div>
          <Suspense fallback={<PageLoader message="Loading page..." />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/map" element={<Map />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/report-issues" element={<ReportIssues />} />
              <Route path="/mobile-version" element={<MobileVersion />} />
              <Route path="/directory" element={<Directory />} />
              <Route path="/feedback-report" element={<FeedbackReport />} />
            </Routes>
          </Suspense>
        </div>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
