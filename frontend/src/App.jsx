import "./index.css";
import Home from "./pages/Home";
import Map from "./pages/Map";
import Feedback from "./pages/Feedback";
import ReportIssues from "./pages/ReportIssues";
import MobileVersion from "./pages/MobileVersion";
import Directory from "./pages/Directory";
import FeedbackReport from "./pages/FeedbackReport";
import { LanguageProvider } from "./context/LanguageContext";
import Header from "./components/Header";
import LioButton from "./components/LioButton";
import Announcements from "./components/Announcements";
import OfflineIndicator from "./components/OfflineIndicator";
import { Routes, Route } from "react-router-dom";

function App() {
  return (
    <LanguageProvider>
      <OfflineIndicator />
      <Header />
      <Announcements />
      <LioButton />
      <div>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/map" element={<Map />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/report-issues" element={<ReportIssues />} />
          <Route path="/mobile-version" element={<MobileVersion />} />
          <Route path="/directory" element={<Directory />} />
          <Route path="/feedback-report" element={<FeedbackReport />} />
        </Routes>
      </div>
    </LanguageProvider>
  );
}

export default App;
