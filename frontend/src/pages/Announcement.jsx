import React, { useState, useEffect } from "react";

const Announcement = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/announcements');
      if (!response.ok) throw new Error('Failed to fetch announcements');
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid response format");
      }
      const data = await response.json();
      setAnnouncements(data);
      setError(null);
    } catch (err) {
      console.warn("API fetch failed, using mock data:", err.message);
      // Fallback to mock data
      setAnnouncements([
        { 
          id: 1, 
          title: "Welcome Event", 
          content: "Join us for the campus welcome.", 
          date: "2023-10-01",
          category: "Events",
          icon: "calendar",
          priority: "Normal"
        },
        { 
          id: 2, 
          title: "Maintenance Notice", 
          content: "Library under maintenance.", 
          date: "2023-10-02",
          category: "Maintenance",
          icon: "wrench",
          priority: "High"
        }
      ]);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Map icon names to SVG components
  const getIconSvg = (iconName) => {
    const iconMap = {
      wrench: (
        <svg className="w-6 h-6 text-[#00594A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      calendar: (
        <svg className="w-6 h-6 text-[#00594A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      "book-open": (
        <svg className="w-6 h-6 text-[#00594A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17.25m20-11.002c5.5 0 10 4.748 10 11.002M4 19.75a2.25 2.25 0 01.75-1.697m6-1.053a3 3 0 112.25 3M9 19.75l-.75 1.697M9 19.75l-.75-1.697m6-2a3 3 0 01.75.75" />
        </svg>
      ),
      bell: (
        <svg className="w-6 h-6 text-[#00594A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      default: (
        <svg className="w-6 h-6 text-[#00594A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    };

    return iconMap[iconName] || iconMap.default;
  };

  // Get category color and badge style
  const getCategoryStyle = (category) => {
    const categoryColors = {
      'Maintenance': { bg: 'bg-red-50', badge: 'bg-red-100 text-red-700', border: 'border-red-200' },
      'Events': { bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
      'Services': { bg: 'bg-green-50', badge: 'bg-green-100 text-green-700', border: 'border-green-200' },
      'General': { bg: 'bg-gray-50', badge: 'bg-gray-100 text-gray-700', border: 'border-gray-200' },
      'Academic': { bg: 'bg-purple-50', badge: 'bg-purple-100 text-purple-700', border: 'border-purple-200' },
      'Safety': { bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700', border: 'border-orange-200' },
    };

    return categoryColors[category] || categoryColors['General'];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5FAF9] via-white to-[#E0F2EF] p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#E0F2EF] border-t-[#007763] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#007763] font-semibold">Loading announcements...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5FAF9] via-white to-[#E0F2EF] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="p-6 bg-red-50 rounded-xl text-red-700 border border-red-200">
            <p className="font-semibold mb-2">Error Loading Announcements</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5FAF9] via-white to-[#E0F2EF] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#00332E] mb-2">Announcements</h1>
          <p className="text-[#007763] text-lg">Stay updated with campus news and important notices</p>
        </div>

        <button
          onClick={fetchAnnouncements}
          className="px-4 py-2 bg-[#00594A] text-white rounded-lg hover:bg-[#007763] transition font-semibold mb-6"
        >
          Refresh
        </button>

        <div className="space-y-4">
          {announcements.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-[#E0F2EF]">
              <svg className="w-16 h-16 text-[#E0F2EF] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0018 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-gray-500 text-lg font-semibold">No announcements available</p>
              <p className="text-gray-400 text-sm mt-2">Check back soon for updates</p>
            </div>
          ) : (
            announcements.map((ann) => {
              const categoryStyle = getCategoryStyle(ann.category, ann.priority);
              
              return (
                <div 
                  key={ann.id} 
                  className={`bg-white rounded-xl p-6 shadow-sm border transition hover:shadow-md ${categoryStyle.border}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon Container */}
                    <div className={`flex-shrink-0 p-3 rounded-lg ${categoryStyle.bg}`}>
                      {getIconSvg(ann.icon)}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-lg text-[#00332E] mb-1">{ann.title}</h3>
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${categoryStyle.badge}`}>
                              {ann.category}
                            </span>
                            {ann.priority === 'High' && (
                              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                ⚠️ High Priority
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="text-gray-700 mb-3 leading-relaxed">{ann.content}</p>

                      {/* Tags */}
                      {ann.tags && Array.isArray(ann.tags) && ann.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {ann.tags.map((tag, i) => (
                            <span key={i} className="bg-[#F5FAF9] text-[#007763] px-2 py-1 rounded text-xs font-medium">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Date */}
                      <p className="text-[#007763] text-sm font-semibold">
                        📅 {new Date(ann.date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Announcement;
