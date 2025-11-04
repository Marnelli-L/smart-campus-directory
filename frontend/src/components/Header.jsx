import { useLanguage } from "../context/LanguageContext";
import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  MdHome,
  MdMap,
  MdBuild,
  MdFeedback,
  MdReport,
  MdPhoneIphone,
  MdLanguage,
  MdMenu,
  MdClose,
  MdPeople,
} from "react-icons/md";

function Header() {
  const [open, setOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const { language, setLanguage } = useLanguage();
  const location = useLocation();
  const langRef = useRef(null);

  const isActive = (path) => location.pathname === path;
  const langLabel = language === "EN" ? "English" : "Tagalog";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langRef.current && !langRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { path: "/", icon: <MdHome size={20} />, label: { EN: "Home", TL: "Home" } },
    { path: "/map", icon: <MdMap size={20} />, label: { EN: "Map", TL: "Mapa" } },
    { path: "/directory", icon: <MdPeople size={20} />, label: { EN: "Directory", TL: "Directory" } },
    { path: "/feedback-report", icon: <MdFeedback size={20} />, label: { EN: "Feedback/Report", TL: "Puna/Iulat" } },
    { path: "/mobile-version", icon: <MdPhoneIphone size={20} />, label: { EN: "Mobile", TL: "Mobile" } },
  ];

  // Example announcement (replace with your logic or props)

  return (
    <header className="w-full bg-[#00332E] text-white shadow-lg z-[1000] relative">
      
      <div className="flex items-center justify-between px-2 md:px-4 py-2">
        {/* Logo & Title */}
        <div className="flex items-center gap-2">
          <img
            src="/images/UDM_LOGO.png"
            alt="UDM Logo"
            className="w-8 h-8 md:w-10 md:h-10 object-contain"
          />
          <div className="leading-tight">
            <h1 className="text-sm md:text-base font-bold tracking-wide whitespace-nowrap">
              UDM CAMPUS NAVIGATION
            </h1>
            <p className="text-[10px] md:text-xs text-gray-300">Smart Campus Directory</p>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium text-sm transition-all duration-200
                ${
                  isActive(item.path)
                    ? "bg-[#00594A] text-white shadow-md"
                    : "hover:bg-[#00594A]/80 hover:shadow-sm"
                }`}
            >
              {item.icon}
              <span>{item.label[language]}</span>
            </Link>
          ))}
        </nav>

        {/* Language Selector */}
        <div ref={langRef} className="relative ml-2">
          <button
            className="flex items-center gap-1.5 text-xs md:text-sm rounded px-2 py-1 md:px-3 md:py-1.5 font-semibold bg-[#00594A] hover:bg-[#007763] transition-colors duration-200"
            style={{ minHeight: "32px" }}
            onClick={() => setOpen((v) => !v)}
          >
            <MdLanguage size={16} />
            <span className="hidden sm:inline">{langLabel}</span>
            <span
              className={`text-xs transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </button>
          {open && (
            <div className="absolute right-0 mt-2 bg-white text-black border rounded-lg shadow-xl z-[1100] min-w-[120px] overflow-hidden">
              <button
                className={`flex items-center gap-2 px-3 py-2 text-xs w-full text-left transition font-medium 
                  ${
                    language === "EN"
                      ? "bg-[#00332E] text-white"
                      : "hover:bg-gray-100"
                  }`}
                onClick={() => {
                  setLanguage("EN");
                  setOpen(false);
                }}
              >
                <MdLanguage size={16} /> English
              </button>
              <div className="border-t" />
              <button
                className={`flex items-center gap-2 px-3 py-2 text-xs w-full text-left transition font-medium 
                  ${
                    language === "TL"
                      ? "bg-[#00332E] text-white"
                      : "hover:bg-gray-100"
                  }`}
                onClick={() => {
                  setLanguage("TL");
                  setOpen(false);
                }}
              >
                <MdLanguage size={16} /> Tagalog
              </button>
            </div>
          )}
        </div>

        {/* Hamburger for Mobile */}
        <button
          className="md:hidden ml-2 p-2 rounded hover:bg-[#00594A]/80 transition"
          onClick={() => setMobileNav((v) => !v)}
        >
          {mobileNav ? <MdClose size={24} /> : <MdMenu size={24} />}
        </button>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileNav && (
        <nav className="md:hidden bg-[#00332E] border-t border-[#00594A] flex flex-col gap-1 px-4 py-2 animate-slide-down">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-base transition-all duration-200
                ${
                  isActive(item.path)
                    ? "bg-[#00594A] text-white shadow-md"
                    : "hover:bg-[#00594A]/80 hover:shadow-sm"
                }`}
              onClick={() => setMobileNav(false)}
            >
              {item.icon}
              <span>{item.label[language]}</span>
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export default Header;
