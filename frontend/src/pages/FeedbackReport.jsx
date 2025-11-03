import React, { useState } from "react";
import { createPortal } from "react-dom";
import OnScreenKeyboard from "../components/OnScreenKeyboard";
import {
  Box,
  Tabs,
  Tab,
  TextField,
  Button,
  Typography,
  MenuItem,
  Paper,
  Alert,
  Rating,
} from "@mui/material";

function FeedbackReport() {
  const [tab, setTab] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [activeField, setActiveField] = useState(null); // {type: 'visitor'|'feedback'|'report', field: string}
  
  // Visitor Feedback state
  const [visitor, setVisitor] = useState({
    name: "",
    address: "",
    contact: "",
    timein: "",
    timeout: "",
    feedback: "",
    services: "",
    rating: 0
  });
  const [visitorSent, setVisitorSent] = useState(false);
  const handleVisitorChange = (e) => {
    setVisitor({ ...visitor, [e.target.name]: e.target.value });
  };

  // Feedback state
  const [feedback, setFeedback] = useState({ name: "", email: "", message: "" });
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Report state
  const [report, setReport] = useState({
    name: "",
    email: "",
    type: "",
    description: "",
  });
  const [reportSent, setReportSent] = useState(false);

  const handleTabChange = (_, newValue) => setTab(newValue);

  const handleFeedbackChange = (e) => {
    setFeedback({ ...feedback, [e.target.name]: e.target.value });
  };
  const handleReportChange = (e) => {
    setReport({ ...report, [e.target.name]: e.target.value });
  };

  // Helper function to handle keyboard input changes
  const handleKeyboardChange = (value) => {
    if (!activeField) return;
    
    if (activeField.type === 'visitor') {
      setVisitor({ ...visitor, [activeField.field]: value });
    } else if (activeField.type === 'feedback') {
      setFeedback({ ...feedback, [activeField.field]: value });
    } else if (activeField.type === 'report') {
      setReport({ ...report, [activeField.field]: value });
    }
  };

  // Helper to get current value
  const getCurrentValue = () => {
    if (!activeField) return '';
    
    if (activeField.type === 'visitor') {
      return visitor[activeField.field] || '';
    } else if (activeField.type === 'feedback') {
      return feedback[activeField.field] || '';
    } else if (activeField.type === 'report') {
      return report[activeField.field] || '';
    }
    return '';
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedback)
      });
      if (response.ok) {
        setFeedbackSent(true);
        setFeedback({ name: "", email: "", message: "" });
        setTimeout(() => setFeedbackSent(false), 3000);
      } else {
        const errorData = await response.json();
        console.error('Error response from server:', errorData);
        alert('Error submitting feedback: ' + (errorData.error || response.statusText));
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Error submitting feedback: ' + error.message);
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: report.name,
          email: report.email,
          issue_type: report.type,
          description: report.description
        })
      });
      if (response.ok) {
        setReportSent(true);
        setReport({ name: "", email: "", type: "", description: "" });
        setTimeout(() => setReportSent(false), 3000);
      } else {
        const errorData = await response.json();
        console.error('Error response from server:', errorData);
        alert('Error submitting report: ' + (errorData.error || response.statusText));
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Error submitting report: ' + error.message);
    }
  };

  const handleVisitorSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/visitor-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: visitor.name,
          address: visitor.address,
          contact: visitor.contact,
          time_in: visitor.timein || null,
          time_out: visitor.timeout || null,
          feedback: visitor.feedback,
          services_visited: visitor.services,
          rating: visitor.rating || 0
        })
      });
      if (response.ok) {
        setVisitorSent(true);
        setVisitor({ name: "", address: "", contact: "", timein: "", timeout: "", feedback: "", services: "", rating: 0 });
        setTimeout(() => setVisitorSent(false), 3000);
      } else {
        const errorData = await response.json();
        console.error('Error response from server:', errorData);
        alert('Error submitting visitor feedback: ' + (errorData.error || response.statusText));
      }
    } catch (error) {
      console.error('Error submitting visitor feedback:', error);
      alert('Error submitting visitor feedback: ' + error.message);
    }
  };

  return (
    <Box sx={{ maxWidth: 420, mx: "auto", mt: 6 }}>
      <Paper
        elevation={3}
        sx={{
          p: 3,
          borderRadius: 3,
          boxShadow: "0 2px 12px 0 rgba(0,105,92,0.08)",
          fontFamily: "inherit",
        }}
      >
        <Tabs
          value={tab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            mb: 2,
            minHeight: 44,
            "& .MuiTabs-indicator": {
              backgroundColor: "#00695C",
              height: 4,
              borderRadius: 2,
            },
            "& .MuiTab-root": {
              color: "#00695C",
              fontWeight: 600,
              fontFamily: "inherit",
              fontSize: 16,
              borderRadius: 2,
              minHeight: 44,
              "&.Mui-selected": {
                color: "#fff",
                background: "#00695C",
              },
            },
          }}
        >
          <Tab label="Feedback" />
          <Tab label="Report an Issue" />
          <Tab label="Visitor Feedback" />
        </Tabs>

        {tab === 0 && (
          <Box
            component="form"
            onSubmit={handleFeedbackSubmit}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              fontFamily: "inherit",
            }}
          >
            {feedbackSent ? (
              <Alert severity="success" sx={{ borderRadius: 2 }}>
                Thank you for your feedback!
              </Alert>
            ) : (
              <>
                <TextField
                  label="Name"
                  name="name"
                  value={feedback.name}
                  onChange={handleFeedbackChange}
                  onFocus={() => {
                    setActiveField({ type: 'feedback', field: 'name' });
                    setKeyboardOpen(true);
                  }}
                  variant="outlined"
                  size="small"
                  fullWidth
                  InputProps={{ readOnly: true }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      "& fieldset": { borderColor: "#00695C" },
                      "&:hover fieldset": { borderColor: "#00594A" },
                      "&.Mui-focused fieldset": { borderColor: "#00594A" },
                    },
                  }}
                  InputLabelProps={{ style: { color: "#00695C" } }}
                />
                <TextField
                  label="Email"
                  name="email"
                  value={feedback.email}
                  onChange={handleFeedbackChange}
                  onFocus={() => {
                    setActiveField({ type: 'feedback', field: 'email' });
                    setKeyboardOpen(true);
                  }}
                  variant="outlined"
                  size="small"
                  fullWidth
                  type="email"
                  InputProps={{ readOnly: true }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      "& fieldset": { borderColor: "#00695C" },
                      "&:hover fieldset": { borderColor: "#00594A" },
                      "&.Mui-focused fieldset": { borderColor: "#00594A" },
                    },
                  }}
                  InputLabelProps={{ style: { color: "#00695C" } }}
                />
                <TextField
                  label="Feedback"
                  name="message"
                  value={feedback.message}
                  onChange={handleFeedbackChange}
                  onFocus={() => {
                    setActiveField({ type: 'feedback', field: 'message' });
                    setKeyboardOpen(true);
                  }}
                  variant="outlined"
                  size="small"
                  fullWidth
                  required
                  multiline
                  minRows={3}
                  InputProps={{ readOnly: true }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      "& fieldset": { borderColor: "#00695C" },
                      "&:hover fieldset": { borderColor: "#00594A" },
                      "&.Mui-focused fieldset": { borderColor: "#00594A" },
                    },
                  }}
                  InputLabelProps={{ style: { color: "#00695C" } }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  sx={{
                    mt: 1,
                    background: "#00695C",
                    color: "#fff",
                    fontWeight: 700,
                    borderRadius: 2,
                    fontFamily: "inherit",
                    boxShadow: "0 2px 8px 0 rgba(0,105,92,0.07)",
                    "&:hover": {
                      background: "#00594A",
                    },
                  }}
                >
                  Submit Feedback
                </Button>
              </>
            )}
          </Box>
  )}

        {tab === 1 && (
          <Box
            component="form"
            onSubmit={handleReportSubmit}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              fontFamily: "inherit",
            }}
          >
            {reportSent ? (
              <Alert severity="success" sx={{ borderRadius: 2 }}>
                Thank you for reporting the issue!
              </Alert>
            ) : (
              <>
                <TextField
                  label="Name"
                  name="name"
                  value={report.name}
                  onChange={handleReportChange}
                  onFocus={() => {
                    setActiveField({ type: 'report', field: 'name' });
                    setKeyboardOpen(true);
                  }}
                  variant="outlined"
                  size="small"
                  fullWidth
                  InputProps={{ readOnly: true }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      "& fieldset": { borderColor: "#00695C" },
                      "&:hover fieldset": { borderColor: "#00594A" },
                      "&.Mui-focused fieldset": { borderColor: "#00594A" },
                    },
                  }}
                  InputLabelProps={{ style: { color: "#00695C" } }}
                />
                <TextField
                  label="Email"
                  name="email"
                  value={report.email}
                  onChange={handleReportChange}
                  onFocus={() => {
                    setActiveField({ type: 'report', field: 'email' });
                    setKeyboardOpen(true);
                  }}
                  variant="outlined"
                  size="small"
                  fullWidth
                  type="email"
                  InputProps={{ readOnly: true }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      "& fieldset": { borderColor: "#00695C" },
                      "&:hover fieldset": { borderColor: "#00594A" },
                      "&.Mui-focused fieldset": { borderColor: "#00594A" },
                    },
                  }}
                  InputLabelProps={{ style: { color: "#00695C" } }}
                />
                <TextField
                  label="Type of Issue"
                  name="type"
                  value={report.type}
                  onChange={handleReportChange}
                  variant="outlined"
                  size="small"
                  fullWidth
                  required
                  select
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "inherit",
                      "& fieldset": { borderColor: "#00695C" },
                      "&:hover fieldset": { borderColor: "#00594A" },
                      "&.Mui-focused fieldset": { borderColor: "#00594A" },
                    },
                  }}
                  InputLabelProps={{ style: { color: "#00695C" } }}
                >
                  <MenuItem value="bug">Bug</MenuItem>
                  <MenuItem value="content">Content</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </TextField>
                <TextField
                  label="Description"
                  name="description"
                  value={report.description}
                  onChange={handleReportChange}
                  onFocus={() => {
                    setActiveField({ type: 'report', field: 'description' });
                    setKeyboardOpen(true);
                  }}
                  variant="outlined"
                  size="small"
                  fullWidth
                  required
                  multiline
                  minRows={3}
                  InputProps={{ readOnly: true }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      "& fieldset": { borderColor: "#00695C" },
                      "&:hover fieldset": { borderColor: "#00594A" },
                      "&.Mui-focused fieldset": { borderColor: "#00594A" },
                    },
                  }}
                  InputLabelProps={{ style: { color: "#00695C" } }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  sx={{
                    mt: 1,
                    background: "#00695C",
                    color: "#fff",
                    fontWeight: 700,
                    borderRadius: 2,
                    fontFamily: "inherit",
                    boxShadow: "0 2px 8px 0 rgba(0,105,92,0.07)",
                    "&:hover": {
                      background: "#00594A",
                    },
                  }}
                >
                  Submit Report
                </Button>
              </>
            )}
          </Box>
        )}
  {tab === 2 && (
          <Box
            component="form"
            onSubmit={handleVisitorSubmit}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              fontFamily: "inherit",
            }}
          >
            {visitorSent ? (
              <Alert severity="success" sx={{ borderRadius: 2 }}>
                Thank you for your feedback!
              </Alert>
            ) : (
              <>
                <TextField
                  label="Name"
                  name="name"
                  value={visitor.name}
                  onChange={handleVisitorChange}
                  onFocus={() => {
                    setActiveField({ type: 'visitor', field: 'name' });
                    setKeyboardOpen(true);
                  }}
                  variant="outlined"
                  size="small"
                  fullWidth
                  required
                  InputProps={{ readOnly: true }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      "& fieldset": { borderColor: "#00695C" },
                      "&:hover fieldset": { borderColor: "#00594A" },
                      "&.Mui-focused fieldset": { borderColor: "#00594A" },
                    },
                  }}
                  InputLabelProps={{ style: { color: "#00695C" } }}
                />
                <TextField
                  label="Address"
                  name="address"
                  value={visitor.address}
                  onChange={handleVisitorChange}
                  onFocus={() => {
                    setActiveField({ type: 'visitor', field: 'address' });
                    setKeyboardOpen(true);
                  }}
                  variant="outlined"
                  size="small"
                  fullWidth
                  required
                  InputProps={{ readOnly: true }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      "& fieldset": { borderColor: "#00695C" },
                      "&:hover fieldset": { borderColor: "#00594A" },
                      "&.Mui-focused fieldset": { borderColor: "#00594A" },
                    },
                  }}
                  InputLabelProps={{ style: { color: "#00695C" } }}
                />
                <TextField
                  label="Contact Number"
                  name="contact"
                  value={visitor.contact}
                  onChange={handleVisitorChange}
                  onFocus={() => {
                    setActiveField({ type: 'visitor', field: 'contact' });
                    setKeyboardOpen(true);
                  }}
                  variant="outlined"
                  size="small"
                  fullWidth
                  required
                  InputProps={{ readOnly: true }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      "& fieldset": { borderColor: "#00695C" },
                      "&:hover fieldset": { borderColor: "#00594A" },
                      "&.Mui-focused fieldset": { borderColor: "#00594A" },
                    },
                  }}
                  InputLabelProps={{ style: { color: "#00695C" } }}
                />
                <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
                  <TextField
                    label="Time In"
                    name="timein"
                    type="time"
                    value={visitor.timein}
                    onChange={handleVisitorChange}
                    variant="outlined"
                    size="small"
                    required
                    sx={{
                      flex: 1,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        fontFamily: "inherit",
                        "& fieldset": { borderColor: "#00695C" },
                        "&:hover fieldset": { borderColor: "#00594A" },
                        "&.Mui-focused fieldset": { borderColor: "#00594A" },
                      },
                      "& .MuiInputLabel-root": { 
                        color: "#00695C",
                        backgroundColor: "white",
                        padding: "0 4px",
                        "&.Mui-focused": { color: "#00594A" }
                      },
                    }}
                    InputLabelProps={{ 
                      style: { color: "#00695C" },
                      shrink: true
                    }}
                  />
                  <TextField
                    label="Time Out"
                    name="timeout"
                    type="time"
                    value={visitor.timeout}
                    onChange={handleVisitorChange}
                    variant="outlined"
                    size="small"
                    required
                    sx={{
                      flex: 1,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        fontFamily: "inherit",
                        "& fieldset": { borderColor: "#00695C" },
                        "&:hover fieldset": { borderColor: "#00594A" },
                        "&.Mui-focused fieldset": { borderColor: "#00594A" },
                      },
                      "& .MuiInputLabel-root": { 
                        color: "#00695C",
                        backgroundColor: "white",
                        padding: "0 4px",
                        "&.Mui-focused": { color: "#00594A" }
                      },
                    }}
                    InputLabelProps={{ 
                      style: { color: "#00695C" },
                      shrink: true
                    }}
                  />
                </Box>
                <TextField
                  label="Feedback / Suggestions"
                  name="feedback"
                  value={visitor.feedback}
                  onChange={handleVisitorChange}
                  onFocus={() => {
                    setActiveField({ type: 'visitor', field: 'feedback' });
                    setKeyboardOpen(true);
                  }}
                  variant="outlined"
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                  InputProps={{ readOnly: true }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      "& fieldset": { borderColor: "#00695C" },
                      "&:hover fieldset": { borderColor: "#00594A" },
                      "&.Mui-focused fieldset": { borderColor: "#00594A" },
                    },
                  }}
                  InputLabelProps={{ style: { color: "#00695C" } }}
                />
                <TextField
                  label="Services / Places to Visit"
                  name="services"
                  value={visitor.services}
                  onChange={handleVisitorChange}
                  onFocus={() => {
                    setActiveField({ type: 'visitor', field: 'services' });
                    setKeyboardOpen(true);
                  }}
                  variant="outlined"
                  size="small"
                  fullWidth
                  multiline
                  minRows={1}
                  InputProps={{ readOnly: true }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      "& fieldset": { borderColor: "#00695C" },
                      "&:hover fieldset": { borderColor: "#00594A" },
                      "&.Mui-focused fieldset": { borderColor: "#00594A" },
                    },
                  }}
                  InputLabelProps={{ style: { color: "#00695C" } }}
                />
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography sx={{ color: "#00695C", fontWeight: 600 }}>Rate Your Experience:</Typography>
                  <Rating
                    name="rating"
                    value={visitor.rating}
                    onChange={(e, newValue) => {
                      setVisitor({ ...visitor, rating: newValue });
                    }}
                    size="large"
                    sx={{
                      "& .MuiRating-iconFilled": {
                        color: "#FFB800",
                      },
                      "& .MuiRating-iconEmpty": {
                        color: "#E0E0E0",
                      },
                      "& .MuiRating-icon": {
                        fontSize: "2.5rem",
                      },
                    }}
                  />
                  <Typography sx={{ color: "#00695C", fontWeight: 600, minWidth: 30 }}>
                    {visitor.rating}/5
                  </Typography>
                </Box>
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  sx={{
                    mt: 1,
                    background: "#00695C",
                    color: "#fff",
                    fontWeight: 700,
                    borderRadius: 2,
                    fontFamily: "inherit",
                    boxShadow: "0 2px 8px 0 rgba(0,105,92,0.07)",
                    "&:hover": {
                      background: "#00594A",
                    },
                  }}
                >
                  Submit Visitor Feedback
                </Button>
              </>
            )}
          </Box>
        )}
      </Paper>

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
              value={getCurrentValue()}
              onChange={handleKeyboardChange}
              type={activeField?.field === 'email' ? 'email' : 'text'}
              onClose={() => setKeyboardOpen(false)}
              onEnter={() => setKeyboardOpen(false)}
              style={{ maxWidth: '900px', width: '95vw' }}
              placeholder={activeField ? `Enter ${activeField.field}` : ''}
            />
          </div>
        </div>,
        document.body
      )}
    </Box>
  );
}

export default FeedbackReport;
