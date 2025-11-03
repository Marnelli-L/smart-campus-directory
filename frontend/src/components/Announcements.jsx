import { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import realTimeUpdates from "../utils/realTimeUpdates";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Announcements() {
  const { language } = useLanguage();
  const [announcements, setAnnouncements] = useState([
    {
      type: { EN: "academic", TL: "akademiko" },
      text: {
        EN: "📚 Enrollment for the next semester begins on August 30.",
        TL: "📚 Ang enrollment para sa susunod na semestre ay magsisimula sa Agosto 30.",
      },
    },
    {
      type: { EN: "events", TL: "kaganapan" },
      text: {
        EN: "🎉 Don't miss the Freshmen Welcome Assembly on September 15 at the university quad.",
        TL: "🎉 Huwag palampasin ang Freshmen Welcome Assembly sa Setyembre 15 sa university quad.",
      },
    },
    {
      type: { EN: "safety", TL: "kaligtasan" },
      text: {
        EN: "🚨 Campus-wide fire drill scheduled for tomorrow, August 25, at 10:00 AM.",
        TL: "🚨 May fire drill sa buong campus bukas, Agosto 25, 10:00 AM.",
      },
    },
    {
      type: { EN: "maintenance", TL: "pagpapanatili" },
      text: {
        EN: "🛠️ The clinic will be under maintenance from August 18th to August 20th.",
        TL: "🛠️ Ang klinika ay isasailalim sa maintenance mula Agosto 18 hanggang Agosto 20.",
      },
    },
  ]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch announcements from API - now with periodic refresh to stay in sync with Admin panel
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await fetch(`${API_URL}/api/announcements`);
        if (!response.ok) throw new Error("Failed to fetch announcements");

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format");
        }

        const data = await response.json();
        console.log("Announcements fetched:", data); // Debug log

        if (data && data.length > 0) {
          // Transform API data to match our component's format
          const formattedAnnouncements = data.map((ann) => {
            // Use category from API, fallback to detection if not provided
            const type = ann.category ? ann.category.toLowerCase() : getAnnouncementType(ann.title, ann.content);
            const emoji = getEmojiForType(type);

            return {
              type: {
                EN: type,
                TL: translateType(type),
              },
              text: {
                EN: `${emoji} ${ann.title}: ${ann.content}`,
                TL: `${emoji} ${ann.title}: ${ann.content}`,
              },
              id: ann.id,
              priority: ann.priority || 'Normal',
              originalData: ann, // Keep original data for reference
            };
          });
          setAnnouncements(formattedAnnouncements);
        }
      } catch (err) {
        console.warn("API fetch failed, using default announcements:", err.message);
        // Keep default announcements if fetch fails
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchAnnouncements();

    // Set up polling every 30 seconds to stay in sync with admin changes
    const intervalId = setInterval(fetchAnnouncements, 30000);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  // Real-time announcements listener
  useEffect(() => {
    const handleRealTimeAnnouncement = (newAnnouncement) => {
      console.log("📢 Real-time announcement received:", newAnnouncement);
      
      // Use category from API, fallback to detection if not provided
      const type = newAnnouncement.category ? newAnnouncement.category.toLowerCase() : getAnnouncementType(newAnnouncement.title, newAnnouncement.content);
      const emoji = getEmojiForType(type);
      
      // Add new announcement to the beginning of the list
      const formattedAnnouncement = {
        type: {
          EN: type,
          TL: translateType(type)
        },
        text: {
          EN: `${emoji} ${newAnnouncement.title}: ${newAnnouncement.content}`,
          TL: `${emoji} ${newAnnouncement.title}: ${newAnnouncement.content}` // You can add translation here
        },
        id: newAnnouncement.id,
        priority: newAnnouncement.priority || 'Normal',
        originalData: newAnnouncement
      };
      
      setAnnouncements(prev => [formattedAnnouncement, ...prev.slice(0, 9)]); // Keep only 10 most recent
      setIndex(0); // Show the new announcement immediately
    };

    // Subscribe to real-time announcement updates
    realTimeUpdates.subscribe('announcement', handleRealTimeAnnouncement);

    // Cleanup subscription on unmount
    return () => {
      realTimeUpdates.unsubscribe('announcement', handleRealTimeAnnouncement);
    };
  }, []);

  // Determine announcement type based on content
  const getAnnouncementType = (title, content) => {
    const combinedText = (title + " " + content).toLowerCase();
    if (combinedText.includes("maintenance")) return "maintenance";
    if (
      combinedText.includes("event") ||
      combinedText.includes("welcome") ||
      combinedText.includes("assembly")
    )
      return "events";
    if (
      combinedText.includes("safety") ||
      combinedText.includes("drill") ||
      combinedText.includes("emergency")
    )
      return "safety";
    if (
      combinedText.includes("enrollment") ||
      combinedText.includes("semester") ||
      combinedText.includes("class")
    )
      return "academic";
    return "general";
  };

  // Get appropriate emoji for type
  const getEmojiForType = (type) => {
    switch (type.toLowerCase()) {
      case "maintenance":
        return "🔧";
      case "events":
        return "📅";
      case "safety":
        return "🚨";
      case "academic":
        return "📚";
      case "services":
        return "📖";
      case "general":
        return "🔔";
      default:
        return "📢";
    }
  };

  // Simple translation of announcement types
  const translateType = (type) => {
    switch (type.toLowerCase()) {
      case "maintenance":
        return "pagpapanatili";
      case "events":
        return "kaganapan";
      case "safety":
        return "kaligtasan";
      case "academic":
        return "akademiko";
      case "services":
        return "serbisyo";
      case "general":
        return "pangkalahatan";
      default:
        return "pangkalahatan";
    }
  };

  // Rotation logic - added check for empty announcements array
  useEffect(() => {
    if (!announcements || announcements.length === 0) return;

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [announcements, announcements.length]);

  if (loading) {
    return (
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          background: "rgba(255,255,255,0.98)",
          padding: "0.5rem 1rem",
          boxShadow: "0 2px 8px 0 rgba(0,0,0,0.08)",
        }}
      >
        Loading announcements...
      </div>
    );
  }

  if (!announcements || announcements.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        background: "rgba(255,255,255,0.98)",
        padding: "0.5rem 1rem",
        boxShadow: "0 2px 8px 0 rgba(0,0,0,0.08)",
        minWidth: 200,
        maxWidth: "100vw",
        margin: 0,
        textAlign: "center",
        borderRadius: 0,
        zIndex: 10,
        position: "relative",
      }}
    >
      <span style={{ fontWeight: "bold", marginRight: 8 }}>
        {announcements[index].type[language].toUpperCase()}:
      </span>
      <span>{announcements[index].text[language]}</span>
    </div>
  );
}

export default Announcements;
