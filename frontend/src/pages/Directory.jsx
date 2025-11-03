import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import OnScreenKeyboard from "../components/OnScreenKeyboard";
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

// Static fallback department data
const staticDepartments = [
  {
    name: "Registrar",
    location: "Main Building, 1st Floor",
    contact: "123-4567",
    email: "registrar@udm.edu.ph",
    staff: "Ms. Maria Santos",
    officeHours: "Mon-Fri 8:00am-5:00pm",
    category: "Administrative",
    accent: "#007763",
    icon: <BusinessIcon />,
    status: "open",
    announcement: "",
    mapLink: "/map?loc=registrar",
  },
  {
    name: "Library",
    location: "Library Building, 2nd Floor",
    contact: "234-5678",
    email: "library@udm.edu.ph",
    staff: "Mr. Juan Dela Cruz",
    officeHours: "Mon-Sat 8:00am-6:00pm",
    category: "Support",
    accent: "#4B8B3B",
    icon: <LocalLibraryIcon />,
    status: "open",
    announcement: "",
    mapLink: "/map?loc=library",
  },
  {
    name: "Guidance Office",
    location: "Annex, Room 101",
    contact: "345-6789",
    email: "guidance@udm.edu.ph",
    staff: "Ms. Ana Reyes",
    officeHours: "Mon-Fri 8:00am-5:00pm",
    category: "Support",
    accent: "#8B5CF6",
    icon: <SupportAgentIcon />,
    status: "open",
    announcement: "",
    mapLink: "/map?loc=guidance",
  },
  {
    name: "IT Department",
    location: "Main Building, 3rd Floor",
    contact: "456-7890",
    email: "it@udm.edu.ph",
    staff: "Engr. Carlo Mendoza",
    officeHours: "Mon-Fri 8:00am-5:00pm",
    category: "Administrative",
    accent: "#0288d1",
    icon: <ComputerIcon />,
    status: "open",
    announcement: "",
    mapLink: "/map?loc=it",
  },
  {
    name: "Computer Laboratory",
    location: "Amba Wing, 2nd Floor",
    contact: "567-8901",
    email: "",
    staff: "Mr. Mark Lim",
    officeHours: "Mon-Sat 8:00am-6:00pm",
    category: "Support",
    accent: "#00BFAE",
    icon: <ComputerIcon />,
    status: "open",
    announcement: "",
    mapLink: "/map?loc=comlab",
  },
  {
    name: "CCS Department ",
    location: "Villar Wing, 2nd Floor",
    contact: "678-9012",
    email: "ccs@udm.edu.ph",
    staff: "Dr. Liza Cruz",
    officeHours: "Mon-Fri 8:00am-5:00pm",
    category: "Academic",
    accent: "#F59E42",
    icon: <SchoolIcon />,
    status: "open",
    announcement: "",
    mapLink: "/map?loc=ccs",
  },
  {
    name: "CCJ Department ",
    location: "Villar Wing, 3rd Floor",
    contact: "789-0123",
    email: "ccj@udm.edu.ph",
    staff: "Atty. Jose Ramos",
    officeHours: "Mon-Fri 8:00am-5:00pm",
    category: "Academic",
    accent: "#E53935",
    icon: <GavelIcon />,
    status: "open",
    announcement: "",
    mapLink: "/map?loc=ccj",
  },
  {
    name: "CAS Department",
    location: "Villar Wing, 4th Floor",
    contact: "890-1234",
    email: "cas@udm.edu.ph",
    staff: "Dr. Maria Lopez",
    officeHours: "Mon-Fri 8:00am-5:00pm",
    category: "Academic",
    accent: "#3B82F6",
    icon: <ScienceIcon />,
    status: "open",
    announcement: "",
    mapLink: "/map?loc=cas",
  },
  {
    name: "CBA Department ",
    location: "Villar Wing, 6th Floor",
    contact: "012-3456",
    email: "cba@udm.edu.ph",
    staff: "Dr. Ramon Santos",
    officeHours: "Mon-Fri 8:00am-5:00pm",
    category: "Academic",
    accent: "#FFD600",
    icon: <AccountBalanceIcon />,
    status: "open",
    announcement: "",
    mapLink: "/map?loc=cba",
  },
  {
    name: "Guidance and Counseling Center",
    location: "Annex, Room 102",
    contact: "234-5679",
    email: "guidancecenter@udm.edu.ph",
    staff: "Ms. Ana Reyes",
    officeHours: "Mon-Fri 8:00am-5:00pm",
    category: "Support",
    accent: "#8B5CF6",
    icon: <PsychologyIcon />,
    status: "open",
    announcement: "",
    mapLink: "/map?loc=gcc",
  },
];

const categories = [
  "All",
  "Administrative",
  "Support", 
  "Academic",
  "General"
];

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
            setDepartments(staticDepartments);
            setError('No departments found in database. Showing default entries.');
          }
        } else {
          console.error('API response not ok:', response.status, response.statusText);
          setDepartments(staticDepartments);
          setError('Failed to connect to server. Showing cached data.');
        }
      } catch (error) {
        console.error('Failed to fetch departments:', error);
        // Always fallback to static data to ensure something displays
        setDepartments(staticDepartments);
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

  const getIconForCategory = (category) => {
    switch (category) {
      case 'Administrative':
        return <BusinessIcon />;
      case 'Support':
        return <SupportAgentIcon />;
      case 'Academic':
        return <SchoolIcon />;
      default:
        return <BusinessIcon />;
    }
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
    <Box sx={{ maxWidth: 1200, mx: "auto", mt: 6, mb: 6, px: 2 }}>
      {/* Header Bar */}
      <Box
        sx={{
          background: "linear-gradient(90deg, #00594A 0%, #007763 100%)",
          color: "#fff",
          borderRadius: 2,
          mb: 3,
          px: { xs: 2, md: 4 },
          py: { xs: 2, md: 3 },
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <Typography variant="h5" fontWeight="bold" sx={{ letterSpacing: 1 }}>
          University Directory
        </Typography>
        <Typography variant="subtitle2" sx={{ opacity: 0.85 }}>
          Find departments, offices, and contact information
        </Typography>
      </Box>

      {/* Category Filter */}
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap" }}>
        {categories.map((cat) => (
          <Chip
            key={cat}
            label={cat}
            color={selectedCategory === cat ? "primary" : "default"}
            onClick={() => setSelectedCategory(cat)}
            sx={{
              fontWeight: selectedCategory === cat ? "bold" : "normal",
              bgcolor: selectedCategory === cat ? "#00594A" : "#e5e5e5",
              color: selectedCategory === cat ? "#fff" : "#222",
              mb: 1,
              cursor: "pointer",
              transition: "background 0.2s, color 0.2s",
              "&:hover": {
                bgcolor: selectedCategory === cat ? "#00594A" : "#d1d5db",
                color: selectedCategory === cat ? "#fff" : "#222",
              },
              "&.Mui-focusVisible": {
                bgcolor: "#00594A",
                color: "#fff",
              },
              boxShadow: "none",
              border: 0,
            }}
            tabIndex={0}
            aria-label={`Filter by ${cat}`}
            onKeyPress={(e) => {
              if (e.key === "Enter" || e.key === " ") setSelectedCategory(cat);
            }}
          />
        ))}
      </Stack>
      <Paper
        elevation={2}
        sx={{
          mb: 3,
          px: { xs: 2, md: 4 },
          py: { xs: 2, md: 3 },
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          boxShadow: "none",
        }}
        component="form"
        onSubmit={handleSearch}
      >
        <TextField
          placeholder="Search department, office, location, or contact"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setKeyboardOpen(true)}
          fullWidth
          size="small"
          variant="outlined"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "#00695C" }} />
              </InputAdornment>
            ),
            readOnly: true, // Read-only for kiosk mode
            sx: {
              borderRadius: 3,
              background: "#fff",
              fontSize: 15,
              minHeight: 38,
              height: 38,
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "#00695C",
                borderWidth: 2,
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "#00594A",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "#00594A",
              },
            },
            inputProps: {
              "aria-label": "Search directory",
              style: {
                paddingTop: 8,
                paddingBottom: 8,
                paddingLeft: 0,
                color: "#222",
                cursor: "pointer",
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
              fontSize: 15,
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
            maxWidth: 450,
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch(e);
          }}
        />
        <Button
          type="submit"
          variant="contained"
          sx={{
            ml: 1,
            background: "#00695C",
            color: "#fff",
            fontWeight: 700,
            borderRadius: 2,
            minWidth: 64,
            minHeight: 38,
            px: 3,
            boxShadow: "none",
            fontSize: "1rem",
            '&:hover': { background: "#00594A" },
            textTransform: "none",
            flexShrink: 0,
          }}
          aria-label="Search"
        >
          Search
        </Button>
      </Paper>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Paper elevation={0} sx={{ p: 4, mb: 3, bgcolor: '#fff3cd', border: '1px solid #ffeaa7' }}>
          <Typography color="#856404">{error}</Typography>
        </Paper>
      )}

      {/* Directory Cards */}
      {!loading && filtered.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: "center", color: "#888" }}>
          No results found.
        </Paper>
      ) : (
        <Grid container spacing={3} justifyContent="center" alignItems="stretch">
          {filtered.map((d, idx) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={4}
              lg={3}
              key={idx}
              sx={{ display: "flex", justifyContent: "center", alignItems: "stretch" }}
            >
              <Card
                elevation={3}
                role="button"
                tabIndex={0}
                aria-label={`View details for ${d.name}`}
                sx={{
                  borderRadius: 3,
                  minWidth: 270,
                  maxWidth: 270,
                  minHeight: 330,
                  maxHeight: 330,
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  transition: "transform 0.15s, box-shadow 0.15s",
                  boxShadow: d.status === "closed" ? 0 : 3,
                  border: d.status === "closed" ? "2px solid #E53935" : undefined,
                  opacity: d.status === "closed" ? 0.7 : 1,
                  "&:hover, &:focus": {
                    transform: "translateY(-4px) scale(1.03)",
                    boxShadow: 6,
                    cursor: "pointer",
                    outline: "2px solid #00594A",
                  },
                  m: "auto",
                  bgcolor: "#fff",
                  p: 0,
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
                    gap: 1,
                    p: 2,
                    width: "100%",
                    height: "100%",
                    position: "relative",
                    paddingBottom: "60px", // Reserve space for button
                  }}
                >
                  {/* Icon Container with extra space at the top */}
                  {/* Image for department (falls back to default) */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                      height: 100,
                      mb: 1,
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
                        width: "90%",
                        maxWidth: 250,
                        height: 100,
                        objectFit: "cover",
                        borderRadius: 8,
                        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
                        background: "#f5f5f5",
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/images/default.png";
                      }}
                    />
                  </Box>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    align="center"
                    sx={{
                      color: "#007763",
                      mb: 1,
                      fontSize: "1.1rem",
                      width: "90%",
                      maxWidth: "90%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      textAlign: "center",
                    }}
                    title={d.name}
                  >
                    {d.name}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <Chip
                      label={d.category}
                      size="small"
                      sx={{
                        bgcolor: "#007763",
                        color: "#fff",
                        fontWeight: "bold",
                        fontSize: "0.75rem",
                        maxWidth: 100,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      aria-label={`Category: ${d.category}`}
                    />
                    {d.status === "closed" && (
                        <Tooltip title="Temporarily Closed">
                          <Chip
                            icon={<WarningIcon sx={{ color: "#fff" }} />}
                            label="Closed"
                            size="small"
                            sx={{
                              bgcolor: "#E53935",
                              color: "#fff",
                              fontWeight: "bold",
                              fontSize: "0.75rem",
                            }}
                          />
                        </Tooltip>
                      )}
                  </Stack>
                  <Typography
                    variant="body2"
                    align="center"
                    sx={{
                      color: "#00332E",
                      mb: 0.5,
                      width: "90%",
                      maxWidth: "90%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={d.location}
                  >
                    <strong>Location:</strong> {d.location}
                  </Typography>
                  <Typography
                    variant="body2"
                    align="center"
                    sx={{
                      color: "#00332E",
                      width: "90%",
                      maxWidth: "90%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={d.contact}
                  >
                    <strong>Contact:</strong> {d.contact}
                  </Typography>
                  
                  {/* Button positioned at bottom */}
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 16,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "calc(100% - 32px)",
                    }}
                  >
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<MapIcon />}
                      sx={{
                        borderColor: "#007763",
                        color: "#007763",
                        "&:hover": { borderColor: "#00594A", bgcolor: "#00776311" },
                        fontWeight: "bold",
                        fontSize: "0.85rem",
                        width: "100%",
                        borderRadius: 2,
                        boxShadow: 0,
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
            </Grid>
          ))}
        </Grid>
      )}

      {/* Department Detail Modal */}
      <Dialog
        open={openModal}
        onClose={handleCloseModal}
        aria-labelledby="dept-detail-title"
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            fontFamily: "inherit",
            maxWidth: "480px",
            margin: 2,
            maxHeight: "90vh",
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
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                fontFamily: "inherit",
                py: 1.5,
                px: 2,
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar sx={{ bgcolor: "#e6f3f1", color: "#00594A", width: 36, height: 36 }}>
                  {modalDept.icon}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0, lineHeight: 1.2 }} noWrap>
                    {modalDept.name}
                  </Typography>
                  <Chip
                    label={modalDept.category}
                    size="small"
                    sx={{
                      bgcolor: "#e6f3f1",
                      color: "#00594A",
                      fontWeight: 600,
                      fontSize: "0.7rem",
                      height: 22,
                    }}
                  />
                </Box>
              </Stack>
            </DialogTitle>
            <DialogContent dividers sx={{ pt: 2, pb: 2, fontFamily: "inherit" }}>
              <Stack spacing={2.5}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <BusinessIcon fontSize="small" sx={{ color: "#00594A" }} />
                  <Typography variant="body2" sx={{ fontSize: "0.9rem" }}>
                    <strong>Location:</strong> {modalDept.location}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <AccessTimeIcon fontSize="small" sx={{ color: "#00594A" }} />
                  <Typography variant="body2" sx={{ fontSize: "0.9rem" }}>
                    <strong>Office Hours:</strong> {modalDept.officeHours}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <PersonIcon fontSize="small" sx={{ color: "#00594A" }} />
                  <Typography variant="body2" sx={{ fontSize: "0.9rem" }}>
                    <strong>Staff-in-Charge:</strong> {modalDept.staff}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <EmailIcon fontSize="small" sx={{ color: "#00594A" }} />
                  <Typography variant="body2" sx={{ fontSize: "0.9rem" }}>
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
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <SupportAgentIcon fontSize="small" sx={{ color: "#00594A" }} />
                  <Typography variant="body2" sx={{ fontSize: "0.9rem" }}>
                    <strong>Contact:</strong> {modalDept.contact}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
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
                px: 2,
                py: 1.25,
                gap: 1,
                borderTop: "1px solid #e5e7eb",
                background: "#fff",
              }}
            >
              <Button
                variant="text"
                size="small"
                sx={{ color: "#6b7280" }}
                onClick={handleCloseModal}
              >
                Close
              </Button>
              <Button
                variant="outlined"
                size="small"
                sx={{ borderColor: "#00594A", color: "#00594A", textTransform: "none" }}
                startIcon={<MapIcon />}
                href={modalDept.mapLink}
                target="_blank"
                aria-label={`View ${modalDept.name} on map`}
              >
                Map
              </Button>
              <Button
                variant="contained"
                size="small"
                sx={{ bgcolor: "#00594A", '&:hover': { bgcolor: "#00473f" }, textTransform: "none" }}
                startIcon={<NavigationIcon />}
                onClick={() => handleNavigateHere(modalDept)}
                aria-label={`Navigate to ${modalDept.name}`}
              >
                Navigate
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* On-Screen Keyboard */}
      {keyboardOpen && createPortal(
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
              suggestions={filtered.slice(0, 8).map(d => d.name)}
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



