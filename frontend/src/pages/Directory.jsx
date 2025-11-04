import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import OnScreenKeyboard from "../components/OnScreenKeyboard";
import { staticDepartments } from "../data/departments";
import {
  Box,
  Paper,
  TextField,
  Typography,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Collapse,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import BusinessIcon from "@mui/icons-material/Business";
import LocalLibraryIcon from "@mui/icons-material/LocalLibrary";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import ComputerIcon from "@mui/icons-material/Computer";
import SchoolIcon from "@mui/icons-material/School";
import GavelIcon from "@mui/icons-material/Gavel";
import PeopleIcon from "@mui/icons-material/People";
import ScienceIcon from "@mui/icons-material/Science";
import EngineeringIcon from "@mui/icons-material/Engineering";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PsychologyIcon from "@mui/icons-material/Psychology";
import MapIcon from "@mui/icons-material/Map";
import FilterListIcon from "@mui/icons-material/FilterList";
import SortIcon from "@mui/icons-material/Sort";
import DownloadIcon from "@mui/icons-material/Download";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { campusSearchEngine, SearchUtils } from "../utils/advancedSearch";
import FeedbackIcon from "@mui/icons-material/Feedback";
import LinkIcon from "@mui/icons-material/Link";
import EmailIcon from "@mui/icons-material/Email";
import PersonIcon from "@mui/icons-material/Person";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import WarningIcon from "@mui/icons-material/Warning";
import NavigationIcon from "@mui/icons-material/Navigation";

const categories = [
  "All",
  "Administrative",
  "Support", 
  "Academic",
  "General"
];

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Helper function to get icon for department category
const getIconForCategory = (category) => {
  switch (category) {
    case 'Administrative':
      return <BusinessIcon />;
    case 'Support':
      return <SupportAgentIcon />;
    case 'Academic':
      return <SchoolIcon />;
    case 'Facility':
      return <ComputerIcon />;
    default:
      return <BusinessIcon />;
  }
};

function Directory() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [openModal, setOpenModal] = useState(false);
  const [modalDept, setModalDept] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  
  // Detect if the device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Generate suggestions from directory entries
  const getDirectorySuggestions = useCallback((query) => {
    if (!query || query.trim().length < 2) return [];
    
    const searchTerm = query.toLowerCase().trim();
    const suggestions = [];
    
    // Helper function to check if term matches at word boundaries
    const matchesWord = (text, term) => {
      const textLower = text.toLowerCase();
      // Exact match
      if (textLower === term) return 'exact';
      // Starts with term
      if (textLower.startsWith(term)) return 'starts';
      // Word boundary match (term appears as separate word)
      const wordBoundaryRegex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
      if (wordBoundaryRegex.test(text)) return 'word';
      // Contains term (lowest priority)
      if (textLower.includes(term)) return 'contains';
      return null;
    };
    
    // Search through departments
    departments.forEach(dept => {
      const score = {
        value: 0,
        label: '',
        sublabel: ''
      };
      
      // Check name (highest priority)
      const nameMatch = matchesWord(dept.name, searchTerm);
      if (nameMatch) {
        if (nameMatch === 'exact') score.value = 100;
        else if (nameMatch === 'starts') score.value = 95;
        else if (nameMatch === 'word') score.value = 90;
        else score.value = 70; // contains
        score.label = dept.name;
        score.sublabel = `${dept.location} • ${dept.category}`;
      }
      // Check location
      else if (dept.location.toLowerCase().includes(searchTerm)) {
        score.value = 60;
        score.label = dept.name;
        score.sublabel = dept.location;
      }
      // Check category
      else if (dept.category.toLowerCase().includes(searchTerm)) {
        score.value = 50;
        score.label = dept.name;
        score.sublabel = `${dept.category} • ${dept.location}`;
      }
      // Check contact
      else if (dept.contact.toLowerCase().includes(searchTerm)) {
        score.value = 40;
        score.label = dept.name;
        score.sublabel = `Contact: ${dept.contact}`;
      }
      // Check email
      else if (dept.email && dept.email.toLowerCase().includes(searchTerm)) {
        score.value = 35;
        score.label = dept.name;
        score.sublabel = dept.email;
      }
      // Check staff
      else if (dept.staff && dept.staff.toLowerCase().includes(searchTerm)) {
        score.value = 30;
        score.label = dept.name;
        score.sublabel = `Staff: ${dept.staff}`;
      }
      
      if (score.value > 0) {
        suggestions.push(score);
      }
    });
    
    // Sort by score (highest first) and return top 8
    return suggestions
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
      .map(s => ({ label: s.label, sublabel: s.sublabel }));
  }, [departments]);

  // Fetch departments from admin API
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoading(true);
        setError(null);
        
  console.log('Fetching departments from API...');
  const response = await fetch(`${API_URL}/api/buildings`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('API Response:', data);
          
          if (data && data.length > 0) {
            // Transform API data to match our component format
            const formattedDepartments = data.map(building => ({
              name: building.name || building.title,
              location: building.location,
              contact: building.contact || building.phone || 'N/A',
              email: building.email || '',
              staff: building.staff || building.contact_person || 'N/A',
              officeHours: building.office_hours || building.hours || 'Mon-Fri 8:00am-5:00pm',
              category: building.category || 'General',
              accent: getAccentColor(building.category || 'General'),
              icon: getIconForCategory(building.category || 'General'),
              status: building.status || 'open',
              announcement: building.announcement || '',
              image: building.image || null,
              mapLink: `/map?loc=${encodeURIComponent(building.name || building.title)}`
            }));
            
            console.log('Formatted departments:', formattedDepartments);
            setDepartments(formattedDepartments);
          } else {
            console.log('No data from API, using static fallback');
            // Add icons to static departments
            const departmentsWithIcons = staticDepartments.map(dept => ({
              ...dept,
              icon: getIconForCategory(dept.category)
            }));
            setDepartments(departmentsWithIcons);
            setError('No departments found in database. Showing default entries.');
          }
        } else {
          console.error('API response not ok:', response.status, response.statusText);
          // Add icons to static departments
          const departmentsWithIcons = staticDepartments.map(dept => ({
            ...dept,
            icon: getIconForCategory(dept.category)
          }));
          setDepartments(departmentsWithIcons);
          setError('Failed to connect to server. Showing cached data.');
        }
      } catch (error) {
        console.error('Failed to fetch departments:', error);
        // Always fallback to static data to ensure something displays
        // Add icons to static departments
        const departmentsWithIcons = staticDepartments.map(dept => ({
          ...dept,
          icon: getIconForCategory(dept.category)
        }));
        setDepartments(departmentsWithIcons);
        setError('Unable to connect to server. Showing cached data.');
      } finally {
        setLoading(false);
      }
    };

    // Fetch from API immediately (don't show static data first)
    fetchDepartments();

    // Set up interval to refresh data every 30 seconds to stay in sync with admin changes
    const intervalId = setInterval(fetchDepartments, 30000);

    // Listen for focus events to refresh when user comes back to the page
    const handleFocus = () => {
      fetchDepartments();
    };
    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Helper functions for formatting
  const getAccentColor = (category) => {
    const colors = {
      'Administrative': '#007763',
      'Support': '#4B8B3B',
      'Academic': '#F59E42',
      'General': '#0288d1'
    };
    return colors[category] || '#0288d1';
  };

  // Initialize search engine with departments data
  useEffect(() => {
    if (departments.length > 0) {
      campusSearchEngine.buildIndex({
        departments: departments.map(dept => ({
          ...dept,
          id: dept.name,
          searchableText: `${dept.name} ${dept.location} ${dept.contact} ${dept.description || ''} ${dept.category}`,
          type: 'department'
        }))
      });
    }
  }, [departments]);

  // Fetch suggestions as user types
  useEffect(() => {
    const fetchSuggestions = () => {
      if (search.trim().length >= 2) {
        const suggestions = getDirectorySuggestions(search.trim());
        setSearchSuggestions(suggestions);
      } else {
        setSearchSuggestions([]);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [search, departments, getDirectorySuggestions]);

  // Enhanced filtering and search logic
  const getFilteredAndSortedResults = React.useMemo(() => {
    let results = departments;

    // Apply advanced search if query exists
    if (search.trim()) {
      try {
        const searchResult = campusSearchEngine.search(search.trim(), {
          maxResults: 50,
          fuzzyThreshold: 0.6
        });
        
        if (searchResult && searchResult.results && searchResult.results.length > 0) {
          // Get department IDs from search results
          const searchIds = searchResult.results.map(r => r.id || r.name);
          results = departments.filter(d => searchIds.includes(d.name));
          
          // Sort by search relevance
          results.sort((a, b) => {
            const aResult = searchResult.results.find(r => (r.id || r.name) === a.name);
            const bResult = searchResult.results.find(r => (r.id || r.name) === b.name);
            return (bResult?.searchScore || 0) - (aResult?.searchScore || 0);
          });
        } else {
          // Fallback to simple text search if advanced search fails
          results = departments.filter(d => {
            const searchTerm = search.toLowerCase();
            return d.name.toLowerCase().includes(searchTerm) ||
                   d.location.toLowerCase().includes(searchTerm) ||
                   d.contact.toLowerCase().includes(searchTerm) ||
                   d.category.toLowerCase().includes(searchTerm) ||
                   (d.email && d.email.toLowerCase().includes(searchTerm)) ||
                   (d.staff && d.staff.toLowerCase().includes(searchTerm));
          });
        }
      } catch (error) {
        console.error('Search engine error:', error);
        // Fallback to simple text search
        results = departments.filter(d => {
          const searchTerm = search.toLowerCase();
          return d.name.toLowerCase().includes(searchTerm) ||
                 d.location.toLowerCase().includes(searchTerm) ||
                 d.contact.toLowerCase().includes(searchTerm) ||
                 d.category.toLowerCase().includes(searchTerm) ||
                 (d.email && d.email.toLowerCase().includes(searchTerm)) ||
                 (d.staff && d.staff.toLowerCase().includes(searchTerm));
        });
      }
    } else {
      // Normal filtering
      results = departments.filter(d => {
        const categoryMatch = selectedCategory === "All" || d.category === selectedCategory;
        return categoryMatch;
      });
      
      // Apply sorting
      results.sort((a, b) => {
        let aVal = a.name?.toString().toLowerCase() || '';
        let bVal = b.name?.toString().toLowerCase() || '';
        return aVal.localeCompare(bVal);
      });
    }

    return results;
  }, [search, selectedCategory, departments]);

  // Export functionality

  // Enhanced search handler

  const handleOpenModal = (dept) => {
    setModalDept(dept);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setModalDept(null);
  };

  const handleNavigateHere = (department) => {
    // Navigate to map with the department as destination
    navigate(`/map?destination=${encodeURIComponent(department.name)}`);
  };

  // Add a handler for search button (same as input change)
  const handleSearch = (e) => {
    e.preventDefault();
    // Analytics tracking could go here
  };

  // Get the filtered results
  const filtered = getFilteredAndSortedResults;

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto", mt: { xs: 2, md: 4 }, mb: { xs: 4, md: 6 }, px: { xs: 1.5, sm: 2, md: 4 } }}>
      {/* Search and Category Filter - Combined in one row */}
      <Paper
        elevation={3}
        sx={{
          mb: { xs: 2, md: 4 },
          px: { xs: 1.5, sm: 2, md: 3 },
          py: { xs: 2, md: 2.5 },
          borderRadius: { xs: 2, md: 3 },
          display: "flex",
          alignItems: "center",
          gap: { xs: 1.5, md: 2 },
          boxShadow: { xs: "0 2px 10px rgba(0,0,0,0.08)", md: "0 4px 20px rgba(0,0,0,0.08)" },
          flexDirection: "column",
          background: "#ffffff",
        }}
        component="form"
        onSubmit={handleSearch}
      >
        {/* Search Field */}
        <Box sx={{ flex: 1, display: "flex", gap: { xs: 1, md: 2 }, width: "100%", flexDirection: { xs: "column", sm: "row" }, position: "relative" }}>
        <Box sx={{ position: "relative", flex: 1, width: "100%" }}>
        <TextField
          placeholder="Search department, office, location..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
          onFocus={() => {
            !isMobile && setKeyboardOpen(true);
          }}
          fullWidth
          size="medium"
          variant="outlined"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "#00594A", fontSize: { xs: 20, md: 24 } }} />
              </InputAdornment>
            ),
            readOnly: !isMobile,
            sx: {
              borderRadius: { xs: 2, md: 3 },
              background: "#f8f9fa",
              fontSize: { xs: 14, md: 16 },
              height: { xs: 44, md: 48 },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "#e0e0e0",
                borderWidth: 2,
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "#00594A",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "#00594A",
                borderWidth: 2,
              },
            },
            inputProps: {
              "aria-label": "Search directory",
              style: {
                paddingTop: 12,
                paddingBottom: 12,
                paddingLeft: 0,
                color: "#222",
                cursor: "pointer",
                fontWeight: 500,
              },
            },
          }}
          inputProps={{
            style: {
              color: "#222",
              fontSize: 15,
              minWidth: 0,
            },
          }}
          sx={{
            "& .MuiInputBase-input::placeholder": {
              color: "#888",
              opacity: 1,
              fontSize: { xs: 13, md: 15 },
            },
            flex: 1,
            minWidth: 0,
            maxWidth: "100%",
            width: "100%",
            cursor: "pointer",
          }}
          style={{
            minWidth: 0,
            width: "100%",
          }}
        />
        </Box>
        <Button
          type="submit"
          variant="contained"
          startIcon={<SearchIcon sx={{ fontSize: { xs: 18, md: 20 } }} />}
          sx={{
            background: "linear-gradient(135deg, #00594A 0%, #007763 100%)",
            color: "#fff",
            fontWeight: 700,
            borderRadius: { xs: 2, md: 3 },
            minWidth: { xs: "100%", sm: 100, md: 120 },
            height: { xs: 44, md: 48 },
            px: { xs: 3, md: 4 },
            boxShadow: "0 4px 12px rgba(0,89,74,0.3)",
            fontSize: { xs: "0.9rem", md: "1rem" },
            '&:hover': { 
              background: "linear-gradient(135deg, #004d3d 0%, #006654 100%)",
              boxShadow: "0 6px 20px rgba(0,89,74,0.4)",
              transform: "translateY(-2px)",
            },
            textTransform: "none",
            flexShrink: 0,
            transition: "all 0.3s",
          }}
          aria-label="Search"
        >
          Search
        </Button>
        </Box>

        {/* Category Filter Chips */}
        <Stack 
          direction="row" 
          spacing={{ xs: 0.75, md: 1.5 }} 
          sx={{ 
            flexWrap: "wrap", 
            gap: { xs: 0.75, md: 1.5 },
            justifyContent: { xs: "center", md: "flex-start" },
            width: "100%",
          }}
        >
          {categories.map((cat) => (
            <Chip
              key={cat}
              label={cat}
              onClick={() => setSelectedCategory(cat)}
              sx={{
                fontWeight: 600,
                bgcolor: selectedCategory === cat ? "linear-gradient(135deg, #00594A 0%, #007763 100%)" : "#ffffff",
                background: selectedCategory === cat ? "linear-gradient(135deg, #00594A 0%, #007763 100%)" : "#ffffff",
                color: selectedCategory === cat ? "#fff" : "#555",
                cursor: "pointer",
                transition: "all 0.3s",
                border: selectedCategory === cat ? "none" : "2px solid #e0e0e0",
                boxShadow: selectedCategory === cat ? "0 4px 12px rgba(0,89,74,0.3)" : "0 2px 6px rgba(0,0,0,0.05)",
                "&:hover": {
                  bgcolor: selectedCategory === cat ? "#004d3d" : "#f0f0f0",
                  background: selectedCategory === cat ? "linear-gradient(135deg, #004d3d 0%, #006654 100%)" : "#f0f0f0",
                  transform: "translateY(-2px)",
                  boxShadow: selectedCategory === cat ? "0 6px 16px rgba(0,89,74,0.4)" : "0 4px 10px rgba(0,0,0,0.1)",
                },
                height: { xs: 30, md: 36 },
                fontSize: { xs: "0.75rem", md: "0.875rem" },
              }}
              tabIndex={0}
              aria-label={`Filter by ${cat}`}
            />
          ))}
        </Stack>
      </Paper>

      {/* Error State */}
      {error && (
        <Paper 
          elevation={0} 
          sx={{ 
            p: { xs: 1.5, md: 2 },
            mb: { xs: 2, md: 3 },
            bgcolor: '#e8f5f3', 
            border: '2px solid #00594A',
            borderRadius: { xs: 1.5, md: 2 },
            display: "flex",
            alignItems: "center",
            gap: { xs: 1, md: 1.5 },
            boxShadow: "0 2px 8px rgba(0,89,74,0.15)",
          }}
        >
          <WarningIcon sx={{ color: "#00594A", fontSize: { xs: 20, md: 24 } }} />
          <Typography variant="body2" color="#00594A" sx={{ fontWeight: 500, fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
            {error}
          </Typography>
        </Paper>
      )}

      {/* Directory Cards */}
      {!loading && filtered.length === 0 ? (
        <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, textAlign: "center", color: "#888", fontSize: { xs: "0.9rem", md: "1rem" } }}>
          No results found.
        </Paper>
      ) : (
        <Box sx={{ position: "relative", width: "100%", pb: { xs: 2, md: 4 } }}>
          {/* Modern Horizontal Slider */}
          <Box
            sx={{
              display: "flex",
              overflowX: "auto",
              gap: { xs: 2, sm: 2.5, md: 3.5 },
              px: { xs: 1.5, sm: 2, md: 3 },
              py: { xs: 2, md: 3 },
              scrollBehavior: "smooth",
              scrollSnapType: "x mandatory",
              "&::-webkit-scrollbar": {
                height: { xs: 6, md: 10 },
              },
              "&::-webkit-scrollbar-track": {
                background: "#e0e0e0",
                borderRadius: 10,
              },
              "&::-webkit-scrollbar-thumb": {
                background: "linear-gradient(135deg, #00594A 0%, #007763 100%)",
                borderRadius: 10,
                "&:hover": {
                  background: "linear-gradient(135deg, #004d3d 0%, #006654 100%)",
                },
              },
            }}
          >
            {filtered.map((d, idx) => (
              <Card
                key={idx}
                elevation={6}
                role="button"
                tabIndex={0}
                aria-label={`View details for ${d.name}`}
                sx={{
                  borderRadius: { xs: 3, md: 4 },
                  minWidth: { xs: 260, sm: 280, md: 360 },
                  maxWidth: { xs: 260, sm: 280, md: 360 },
                  flexShrink: 0,
                  scrollSnapAlign: "center",
                  position: "relative",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: d.status === "closed" 
                    ? "0 4px 12px rgba(229,57,53,0.2)" 
                    : { xs: "0 4px 16px rgba(0,0,0,0.1)", md: "0 8px 24px rgba(0,0,0,0.12)" },
                  border: d.status === "closed" ? "3px solid #E53935" : "1px solid #f0f0f0",
                  opacity: d.status === "closed" ? 0.85 : 1,
                  background: "linear-gradient(to bottom, #ffffff 0%, #fafafa 100%)",
                  "&:hover": {
                    transform: { xs: "translateY(-6px) scale(1.02)", md: "translateY(-12px) scale(1.03)" },
                    boxShadow: d.status === "closed"
                      ? "0 12px 32px rgba(229,57,53,0.3)"
                      : { xs: "0 8px 24px rgba(0,89,74,0.2)", md: "0 16px 48px rgba(0,89,74,0.25)" },
                    cursor: "pointer",
                  },
                  "&:focus": {
                    outline: "3px solid #00594A",
                    outlineOffset: "2px",
                  },
                  bgcolor: "#fff",
                  overflow: "hidden",
                }}
                onClick={() => handleOpenModal(d)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleOpenModal(d);
                }}
              >
                <CardContent
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: { xs: 0.75, md: 1 },
                    p: { xs: 2, md: 3 },
                    pb: { xs: 8, md: 9 },
                    width: "100%",
                    minHeight: { xs: 340, md: 400 },
                    position: "relative",
                  }}
                >
                  {/* Image for department */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                      height: { xs: 100, md: 120 },
                      mb: { xs: 1.5, md: 2 },
                      overflow: "hidden",
                      borderRadius: { xs: 2, md: 3 },
                      boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                      background: "#f0f0f0",
                    }}
                  >
                    <img
                      src={
                        d.image
                          ? `${API_URL}${d.image}`
                          : d.name === "Registrar"
                          ? "/images/sample directory image.jpg"
                          : d.name === "Library"
                          ? "/images/library.jpg"
                          : d.name === "Guidance Office"
                          ? "/images/guidance.png"
                          : d.name === "IT Department"
                          ? "/images/it.png"
                          : "/images/default.png"
                      }
                      alt={d.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/images/default.png";
                      }}
                    />
                  </Box>
                  <Typography
                    variant="h6"
                    fontWeight="700"
                    align="center"
                    sx={{
                      color: "#00594A",
                      mb: { xs: 0.75, md: 1 },
                      fontSize: { xs: "1rem", md: "1.125rem" },
                      width: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      px: { xs: 0.5, md: 1 },
                      letterSpacing: "-0.5px",
                    }}
                    title={d.name}
                  >
                    {d.name}
                  </Typography>
                  <Stack direction="row" spacing={{ xs: 0.5, md: 1 }} sx={{ mb: { xs: 0.75, md: 1 }, justifyContent: "center", flexWrap: "wrap" }}>
                    <Chip
                      label={d.category}
                      size="small"
                      sx={{
                        background: "linear-gradient(135deg, #00594A 0%, #007763 100%)",
                        color: "#fff",
                        fontWeight: "700",
                        fontSize: { xs: "0.7rem", md: "0.75rem" },
                        maxWidth: { xs: 100, md: 120 },
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        boxShadow: "0 2px 8px rgba(0,89,74,0.3)",
                        height: { xs: 24, md: 28 },
                      }}
                      aria-label={`Category: ${d.category}`}
                    />
                    {d.status === "closed" && (
                        <Tooltip title="Temporarily Closed">
                          <Chip
                            icon={<WarningIcon sx={{ color: "#fff", fontSize: { xs: 14, md: 16 } }} />}
                            label="Closed"
                            size="small"
                            sx={{
                              bgcolor: "#E53935",
                              color: "#fff",
                              fontWeight: "700",
                              fontSize: { xs: "0.7rem", md: "0.75rem" },
                              boxShadow: "0 2px 8px rgba(229,57,53,0.3)",
                              height: { xs: 24, md: 28 },
                            }}
                          />
                        </Tooltip>
                      )}
                  </Stack>
                  <Typography
                    variant="body2"
                    align="center"
                    sx={{
                      color: "#333",
                      mb: { xs: 0.5, md: 0.75 },
                      width: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      px: { xs: 0.5, md: 1 },
                      fontSize: { xs: "0.8rem", md: "0.9rem" },
                      fontWeight: 500,
                    }}
                    title={d.location}
                  >
                    <strong style={{ color: "#00594A" }}>Location:</strong> {d.location}
                  </Typography>
                  <Typography
                    variant="body2"
                    align="center"
                    sx={{
                      color: "#333",
                      mb: { xs: 2, md: 3 },
                      width: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      px: { xs: 0.5, md: 1 },
                      fontSize: { xs: "0.8rem", md: "0.9rem" },
                      fontWeight: 500,
                    }}
                    title={d.contact}
                  >
                    <strong style={{ color: "#00594A" }}>Contact:</strong> {d.contact}
                  </Typography>
                  
                  {/* Button positioned at bottom */}
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: { xs: 12, md: 16 },
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "calc(100% - 24px)",
                    }}
                  >
                    <Button
                      variant="contained"
                      size="medium"
                      startIcon={<MapIcon sx={{ fontSize: { xs: 16, md: 18 } }} />}
                      sx={{
                        background: "linear-gradient(135deg, #00594A 0%, #007763 100%)",
                        color: "#fff",
                        "&:hover": { 
                          background: "linear-gradient(135deg, #004d3d 0%, #006654 100%)",
                          transform: "translateY(-2px)",
                          boxShadow: "0 6px 16px rgba(0,89,74,0.4)",
                        },
                        fontWeight: "700",
                        fontSize: { xs: "0.8rem", md: "0.875rem" },
                        width: "100%",
                        borderRadius: { xs: 2, md: 3 },
                        boxShadow: "0 4px 12px rgba(0,89,74,0.3)",
                        py: { xs: 0.75, md: 1 },
                        textTransform: "none",
                        transition: "all 0.3s",
                      }}
                      href={d.mapLink}
                      target="_blank"
                      tabIndex={-1}
                      aria-label={`View ${d.name} on map`}
                    >
                      View on Map
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {/* Department Detail Modal */}
      <Dialog
        open={openModal}
        onClose={handleCloseModal}
        aria-labelledby="dept-detail-title"
        maxWidth="sm"
        fullWidth
        fullScreen={false}
        PaperProps={{
          sx: {
            borderRadius: { xs: 2, md: 2 },
            fontFamily: "inherit",
            maxWidth: "480px",
            margin: { xs: 1, md: 2 },
            maxHeight: { xs: "95vh", md: "90vh" },
            width: { xs: "calc(100% - 16px)", md: "100%" },
            animation: "slideUp 0.25s ease-out",
            "@keyframes slideUp": {
              "0%": { transform: "translateY(50px)", opacity: 0 },
              "100%": { transform: "translateY(0)", opacity: 1 },
            },
          },
        }}
        BackdropProps={{
          sx: {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
          },
        }}
        TransitionProps={{
          timeout: 300,
        }}
      >
        {modalDept && (
          <>
            <DialogTitle
              id="dept-detail-title"
              sx={{
                bgcolor: "#fff",
                color: "#0b3d36",
                borderTopLeftRadius: { xs: 8, md: 8 },
                borderTopRightRadius: { xs: 8, md: 8 },
                fontFamily: "inherit",
                py: { xs: 1.25, md: 1.5 },
                px: { xs: 1.5, md: 2 },
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <Stack direction="row" alignItems="center" spacing={{ xs: 1, md: 1.5 }}>
                <Avatar sx={{ bgcolor: "#e6f3f1", color: "#00594A", width: { xs: 32, md: 36 }, height: { xs: 32, md: 36 } }}>
                  {modalDept.icon}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0, lineHeight: 1.2, fontSize: { xs: "1rem", md: "1.25rem" } }} noWrap>
                    {modalDept.name}
                  </Typography>
                  <Chip
                    label={modalDept.category}
                    size="small"
                    sx={{
                      bgcolor: "#e6f3f1",
                      color: "#00594A",
                      fontWeight: 600,
                      fontSize: { xs: "0.65rem", md: "0.7rem" },
                      height: { xs: 20, md: 22 },
                      mt: 0.5,
                    }}
                  />
                </Box>
              </Stack>
            </DialogTitle>
            <DialogContent dividers sx={{ pt: { xs: 1.5, md: 2 }, pb: { xs: 1.5, md: 2 }, px: { xs: 1.5, md: 2 }, fontFamily: "inherit" }}>
              <Stack spacing={{ xs: 2, md: 2.5 }}>
                <Stack direction="row" spacing={{ xs: 1, md: 1.25 }} alignItems="center">
                  <BusinessIcon fontSize="small" sx={{ color: "#00594A", fontSize: { xs: 18, md: 20 } }} />
                  <Typography variant="body2" sx={{ fontSize: { xs: "0.8rem", md: "0.9rem" } }}>
                    <strong>Location:</strong> {modalDept.location}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={{ xs: 1, md: 1.25 }} alignItems="center">
                  <AccessTimeIcon fontSize="small" sx={{ color: "#00594A", fontSize: { xs: 18, md: 20 } }} />
                  <Typography variant="body2" sx={{ fontSize: { xs: "0.8rem", md: "0.9rem" } }}>
                    <strong>Office Hours:</strong> {modalDept.officeHours}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={{ xs: 1, md: 1.25 }} alignItems="center">
                  <PersonIcon fontSize="small" sx={{ color: "#00594A", fontSize: { xs: 18, md: 20 } }} />
                  <Typography variant="body2" sx={{ fontSize: { xs: "0.8rem", md: "0.9rem" } }}>
                    <strong>Staff-in-Charge:</strong> {modalDept.staff}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={{ xs: 1, md: 1.25 }} alignItems="center">
                  <EmailIcon fontSize="small" sx={{ color: "#00594A", fontSize: { xs: 18, md: 20 } }} />
                  <Typography variant="body2" sx={{ fontSize: { xs: "0.8rem", md: "0.9rem" } }}>
                    <strong>Email:</strong>{" "}
                    {modalDept.email ? (
                      <a
                        href={`mailto:${modalDept.email}`}
                        style={{ color: "#00594A", textDecoration: "underline" }}
                      >
                        {modalDept.email}
                      </a>
                    ) : (
                      <span style={{ color: "#999" }}>N/A</span>
                    )}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={{ xs: 1, md: 1.25 }} alignItems="center">
                  <SupportAgentIcon fontSize="small" sx={{ color: "#00594A", fontSize: { xs: 18, md: 20 } }} />
                  <Typography variant="body2" sx={{ fontSize: { xs: "0.8rem", md: "0.9rem" } }}>
                    <strong>Contact:</strong> {modalDept.contact}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={{ xs: 1, md: 1.5 }} alignItems="center" sx={{ mt: { xs: 0.5, md: 1 } }}>
                  <Chip
                    label={modalDept.category}
                    size="small"
                    sx={{
                      bgcolor: "#00695C",
                      color: "#fff",
                      fontWeight: "bold",
                      fontSize: "0.8rem",
                      borderRadius: 2,
                      fontFamily: "inherit",
                    }}
                  />
                  {modalDept.status === "closed" && (
                    <Tooltip title="Temporarily Closed">
                      <Chip
                        icon={<WarningIcon sx={{ color: "#fff" }} />}
                        label="Closed"
                        size="small"
                        sx={{
                          bgcolor: "#E53935",
                          color: "#fff",
                          fontWeight: "bold",
                          fontSize: "0.8rem",
                          borderRadius: 2,
                          fontFamily: "inherit",
                        }}
                      />
                    </Tooltip>
                  )}
                </Stack>
                {modalDept.announcement && (
                  <Paper
                    sx={{
                      bgcolor: "#FFF3E0",
                      p: 2,
                      mt: 2,
                      borderLeft: "4px solid #E53935",
                      borderRadius: 2,
                      fontFamily: "inherit",
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <WarningIcon sx={{ color: "#E53935" }} />
                      <Typography variant="body2" sx={{ color: "#E53935", fontSize: "0.95rem" }}>
                        <strong>Announcement:</strong> {modalDept.announcement}
                      </Typography>
                    </Stack>
                  </Paper>
                )}
                
                {/* (Removed quick actions at user request) */}
              </Stack>
            </DialogContent>
            <DialogActions
              sx={{
                justifyContent: "flex-end",
                px: { xs: 1.5, md: 2 },
                py: { xs: 1, md: 1.25 },
                gap: { xs: 0.75, md: 1 },
                borderTop: "1px solid #e5e7eb",
                background: "#fff",
                flexWrap: { xs: "wrap", sm: "nowrap" },
              }}
            >
              <Button
                variant="text"
                size="small"
                sx={{ color: "#6b7280", fontSize: { xs: "0.8rem", md: "0.875rem" } }}
                onClick={handleCloseModal}
              >
                Close
              </Button>
              <Button
                variant="outlined"
                size="small"
                sx={{ 
                  borderColor: "#00594A", 
                  color: "#00594A", 
                  textTransform: "none",
                  fontSize: { xs: "0.8rem", md: "0.875rem" },
                  minWidth: { xs: 70, md: 80 },
                }}
                startIcon={<MapIcon sx={{ fontSize: { xs: 16, md: 18 } }} />}
                href={modalDept.mapLink}
                target="_blank"
                aria-label={`View ${modalDept.name} on map`}
              >
                Map
              </Button>
              <Button
                variant="contained"
                size="small"
                sx={{ 
                  bgcolor: "#00594A", 
                  '&:hover': { bgcolor: "#00473f" }, 
                  textTransform: "none",
                  fontSize: { xs: "0.8rem", md: "0.875rem" },
                  minWidth: { xs: 90, md: 100 },
                }}
                startIcon={<NavigationIcon sx={{ fontSize: { xs: 16, md: 18 } }} />}
                onClick={() => handleNavigateHere(modalDept)}
                aria-label={`Navigate to ${modalDept.name}`}
              >
                Navigate
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* On-Screen Keyboard - Only show on non-mobile devices */}
      {!isMobile && keyboardOpen && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 100%)',
            animation: 'fadeIn 0.2s ease-out',
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setKeyboardOpen(false);
          }}
        >
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { 
                transform: translateY(100%); 
                opacity: 0;
              }
              to { 
                transform: translateY(0); 
                opacity: 1;
              }
            }
          `}</style>
          <div style={{ animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            <OnScreenKeyboard
              value={search}
              onChange={(v) => setSearch(v)}
              suggestions={searchSuggestions}
              onClose={() => setKeyboardOpen(false)}
              onEnter={() => setKeyboardOpen(false)}
              style={{ maxWidth: '900px', width: '95vw' }}
              placeholder="Search department, office, location, or contact"
            />
          </div>
        </div>,
        document.body
      )}
    </Box>
  );
}

export default Directory;



