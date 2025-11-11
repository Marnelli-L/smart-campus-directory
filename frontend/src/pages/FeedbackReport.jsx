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
  
  // Detect if the device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Validation errors state
  const [feedbackErrors, setFeedbackErrors] = useState({});
  const [reportErrors, setReportErrors] = useState({});
  const [visitorErrors, setVisitorErrors] = useState({});
  
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
    const { name, value } = e.target;
    setVisitor({ ...visitor, [name]: value });
    // Clear error for this field when user types
    if (visitorErrors[name]) {
      setVisitorErrors({ ...visitorErrors, [name]: "" });
    }
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

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateName = (name) => {
    // Name should only contain letters, spaces, and common punctuation
    const nameRegex = /^[a-zA-Z\s\-'.]+$/;
    return name.trim().length >= 2 && name.trim().length <= 100 && nameRegex.test(name);
  };

  const validateContact = (contact) => {
    // Contact should be 10-15 digits, may include +, spaces, hyphens, parentheses
    const contactRegex = /^[\d\s\-+()]{10,15}$/;
    return contactRegex.test(contact);
  };

  const validateText = (text, minLength = 1, maxLength = 1000) => {
    const trimmed = text.trim();
    return trimmed.length >= minLength && trimmed.length <= maxLength;
  };

  const validateTime = (time) => {
    // Time format HH:MM
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const sanitizeInput = (input) => {
    // Remove potential XSS characters
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<[^>]*>/g, '')
                .trim();
  };

  const handleTabChange = (_, newValue) => setTab(newValue);

  const handleFeedbackChange = (e) => {
    const { name, value } = e.target;
    setFeedback({ ...feedback, [name]: value });
    // Clear error for this field when user types
    if (feedbackErrors[name]) {
      setFeedbackErrors({ ...feedbackErrors, [name]: "" });
    }
  };
  
  const handleReportChange = (e) => {
    const { name, value } = e.target;
    setReport({ ...report, [name]: value });
    // Clear error for this field when user types
    if (reportErrors[name]) {
      setReportErrors({ ...reportErrors, [name]: "" });
    }
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
    
    // Validate feedback data
    const errors = {};
    
    // Sanitize inputs
    const sanitizedFeedback = {
      name: sanitizeInput(feedback.name),
      email: sanitizeInput(feedback.email),
      message: sanitizeInput(feedback.message)
    };
    
    // Validate name (optional field)
    if (sanitizedFeedback.name && !validateName(sanitizedFeedback.name)) {
      errors.name = "Name must be 2-100 characters and contain only letters, spaces, hyphens, and apostrophes";
    }
    
    // Validate email (optional field)
    if (sanitizedFeedback.email && !validateEmail(sanitizedFeedback.email)) {
      errors.email = "Please enter a valid email address";
    }
    
    // Validate message (required)
    if (!validateText(sanitizedFeedback.message, 10, 1000)) {
      errors.message = "Message must be between 10 and 1000 characters";
    }
    
    if (Object.keys(errors).length > 0) {
      setFeedbackErrors(errors);
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedFeedback)
      });
      if (response.ok) {
        setFeedbackSent(true);
        setFeedback({ name: "", email: "", message: "" });
        setFeedbackErrors({});
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
    
    // Validate report data
    const errors = {};
    
    // Sanitize inputs
    const sanitizedReport = {
      name: sanitizeInput(report.name),
      email: sanitizeInput(report.email),
      type: sanitizeInput(report.type),
      description: sanitizeInput(report.description)
    };
    
    // Validate name (optional field)
    if (sanitizedReport.name && !validateName(sanitizedReport.name)) {
      errors.name = "Name must be 2-100 characters and contain only letters, spaces, hyphens, and apostrophes";
    }
    
    // Validate email (optional field)
    if (sanitizedReport.email && !validateEmail(sanitizedReport.email)) {
      errors.email = "Please enter a valid email address";
    }
    
    // Validate type (required)
    if (!sanitizedReport.type || !['bug', 'content', 'other'].includes(sanitizedReport.type)) {
      errors.type = "Please select a valid issue type";
    }
    
    // Validate description (required)
    if (!validateText(sanitizedReport.description, 10, 1000)) {
      errors.description = "Description must be between 10 and 1000 characters";
    }
    
    if (Object.keys(errors).length > 0) {
      setReportErrors(errors);
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sanitizedReport.name,
          email: sanitizedReport.email,
          issue_type: sanitizedReport.type,
          description: sanitizedReport.description
        })
      });
      if (response.ok) {
        setReportSent(true);
        setReport({ name: "", email: "", type: "", description: "" });
        setReportErrors({});
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
    
    // Validate visitor feedback data
    const errors = {};
    
    // Sanitize inputs
    const sanitizedVisitor = {
      name: sanitizeInput(visitor.name),
      address: sanitizeInput(visitor.address),
      contact: sanitizeInput(visitor.contact),
      timein: visitor.timein,
      timeout: visitor.timeout,
      feedback: sanitizeInput(visitor.feedback),
      services: sanitizeInput(visitor.services),
      rating: visitor.rating
    };
    
    // Validate name (required)
    if (!validateName(sanitizedVisitor.name)) {
      errors.name = "Name must be 2-100 characters and contain only letters, spaces, hyphens, and apostrophes";
    }
    
    // Validate address (required)
    if (!validateText(sanitizedVisitor.address, 5, 200)) {
      errors.address = "Address must be between 5 and 200 characters";
    }
    
    // Validate contact (required)
    if (!validateContact(sanitizedVisitor.contact)) {
      errors.contact = "Contact must be a valid phone number (10-15 digits)";
    }
    
    // Validate time in (required)
    if (!validateTime(sanitizedVisitor.timein)) {
      errors.timein = "Please enter a valid time";
    }
    
    // Validate time out (required)
    if (!validateTime(sanitizedVisitor.timeout)) {
      errors.timeout = "Please enter a valid time";
    }
    
    // Check that time out is after time in
    if (sanitizedVisitor.timein && sanitizedVisitor.timeout) {
      const [inHours, inMinutes] = sanitizedVisitor.timein.split(':').map(Number);
      const [outHours, outMinutes] = sanitizedVisitor.timeout.split(':').map(Number);
      const timeInMinutes = inHours * 60 + inMinutes;
      const timeOutMinutes = outHours * 60 + outMinutes;
      
      if (timeOutMinutes <= timeInMinutes) {
        errors.timeout = "Time out must be after time in";
      }
    }
    
    // Validate feedback (optional, but if provided must be valid)
    if (sanitizedVisitor.feedback && !validateText(sanitizedVisitor.feedback, 1, 1000)) {
      errors.feedback = "Feedback must be less than 1000 characters";
    }
    
    // Validate services (optional, but if provided must be valid)
    if (sanitizedVisitor.services && !validateText(sanitizedVisitor.services, 1, 500)) {
      errors.services = "Services must be less than 500 characters";
    }
    
    // Validate rating (must be 0-5)
    if (typeof sanitizedVisitor.rating !== 'number' || sanitizedVisitor.rating < 0 || sanitizedVisitor.rating > 5) {
      errors.rating = "Rating must be between 0 and 5";
    }
    
    if (Object.keys(errors).length > 0) {
      setVisitorErrors(errors);
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/visitor-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sanitizedVisitor.name,
          address: sanitizedVisitor.address,
          contact: sanitizedVisitor.contact,
          time_in: sanitizedVisitor.timein || null,
          time_out: sanitizedVisitor.timeout || null,
          feedback: sanitizedVisitor.feedback,
          services_visited: sanitizedVisitor.services,
          rating: sanitizedVisitor.rating || 0
        })
      });
      if (response.ok) {
        setVisitorSent(true);
        setVisitor({ name: "", address: "", contact: "", timein: "", timeout: "", feedback: "", services: "", rating: 0 });
        setVisitorErrors({});
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
    <Box sx={{ maxWidth: isMobile ? '95%' : 420, mx: "auto", mt: isMobile ? 2 : 6, px: isMobile ? 1 : 0 }}>
      <Paper
        elevation={3}
        sx={{
          p: isMobile ? 2 : 3,
          borderRadius: isMobile ? 2 : 3,
          boxShadow: "0 2px 12px 0 rgba(0,105,92,0.08)",
          fontFamily: "inherit",
        }}
      >
        <Tabs
          value={tab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            mb: isMobile ? 1.5 : 2,
            minHeight: isMobile ? 40 : 44,
            "& .MuiTabs-indicator": {
              backgroundColor: "#00695C",
              height: isMobile ? 3 : 4,
              borderRadius: 2,
            },
            "& .MuiTab-root": {
              color: "#00695C",
              fontWeight: 600,
              fontFamily: "inherit",
              fontSize: isMobile ? 13 : 16,
              borderRadius: 2,
              minHeight: isMobile ? 40 : 44,
              padding: isMobile ? "6px 8px" : "12px 16px",
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
              gap: isMobile ? 1.5 : 2,
              fontFamily: "inherit",
            }}
          >
            {feedbackSent ? (
              <Alert severity="success" sx={{ 
                borderRadius: 2,
                fontSize: isMobile ? '13px' : '14px',
                padding: isMobile ? '6px 12px' : '8px 16px'
              }}>
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
                    if (!isMobile) {
                      setActiveField({ type: 'feedback', field: 'name' });
                      setKeyboardOpen(true);
                    }
                  }}
                  variant="outlined"
                  size="small"
                  fullWidth
                  error={!!feedbackErrors.name}
                  helperText={feedbackErrors.name}
                  InputProps={{ 
                    readOnly: !isMobile,
                    style: { fontSize: isMobile ? '13px' : '14px' }
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      "& fieldset": { borderColor: feedbackErrors.name ? "#d32f2f" : "#00695C" },
                      "&:hover fieldset": { borderColor: feedbackErrors.name ? "#d32f2f" : "#00594A" },
                      "&.Mui-focused fieldset": { borderColor: feedbackErrors.name ? "#d32f2f" : "#00594A" },
                    },
                    "& .MuiInputLabel-root": { 
                      color: feedbackErrors.name ? "#d32f2f" : "#00695C",
                      fontSize: isMobile ? '13px' : '14px'
                    },
                    "& .MuiFormHelperText-root": {
                      fontSize: isMobile ? '11px' : '12px'
                    }
                  }}
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
                  error={!!feedbackErrors.email}
                  helperText={feedbackErrors.email}
                  InputProps={{ readOnly: !isMobile }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      "& fieldset": { borderColor: feedbackErrors.email ? "#d32f2f" : "#00695C" },
                      "&:hover fieldset": { borderColor: feedbackErrors.email ? "#d32f2f" : "#00594A" },
                      "&.Mui-focused fieldset": { borderColor: feedbackErrors.email ? "#d32f2f" : "#00594A" },
                    },
                  }}
                  InputLabelProps={{ style: { color: feedbackErrors.email ? "#d32f2f" : "#00695C" } }}
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
                  error={!!feedbackErrors.message}
                  helperText={feedbackErrors.message || "Minimum 10 characters required"}
                  InputProps={{ readOnly: !isMobile }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      "& fieldset": { borderColor: feedbackErrors.message ? "#d32f2f" : "#00695C" },
                      "&:hover fieldset": { borderColor: feedbackErrors.message ? "#d32f2f" : "#00594A" },
                      "&.Mui-focused fieldset": { borderColor: feedbackErrors.message ? "#d32f2f" : "#00594A" },
                    },
                  }}
                  InputLabelProps={{ style: { color: feedbackErrors.message ? "#d32f2f" : "#00695C" } }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  sx={{
                    mt: isMobile ? 0.5 : 1,
                    background: "#00695C",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: isMobile ? '13px' : '14px',
                    padding: isMobile ? '8px 16px' : '10px 16px',
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
              gap: isMobile ? 1.5 : 2,
              fontFamily: "inherit",
            }}
          >
            {reportSent ? (
              <Alert severity="success" sx={{ 
                borderRadius: 2,
                fontSize: isMobile ? '13px' : '14px',
                padding: isMobile ? '6px 12px' : '8px 16px'
              }}>
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
                  error={!!reportErrors.name}
                  helperText={reportErrors.name}
                  InputProps={{ readOnly: !isMobile }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      "& fieldset": { borderColor: reportErrors.name ? "#d32f2f" : "#00695C" },
                      "&:hover fieldset": { borderColor: reportErrors.name ? "#d32f2f" : "#00594A" },
                      "&.Mui-focused fieldset": { borderColor: reportErrors.name ? "#d32f2f" : "#00594A" },
                    },
                  }}
                  InputLabelProps={{ style: { color: reportErrors.name ? "#d32f2f" : "#00695C" } }}
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
                  error={!!reportErrors.email}
                  helperText={reportErrors.email}
                  InputProps={{ readOnly: !isMobile }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      "& fieldset": { borderColor: reportErrors.email ? "#d32f2f" : "#00695C" },
                      "&:hover fieldset": { borderColor: reportErrors.email ? "#d32f2f" : "#00594A" },
                      "&.Mui-focused fieldset": { borderColor: reportErrors.email ? "#d32f2f" : "#00594A" },
                    },
                  }}
                  InputLabelProps={{ style: { color: reportErrors.email ? "#d32f2f" : "#00695C" } }}
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
                  error={!!reportErrors.type}
                  helperText={reportErrors.type}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "inherit",
                      "& fieldset": { borderColor: reportErrors.type ? "#d32f2f" : "#00695C" },
                      "&:hover fieldset": { borderColor: reportErrors.type ? "#d32f2f" : "#00594A" },
                      "&.Mui-focused fieldset": { borderColor: reportErrors.type ? "#d32f2f" : "#00594A" },
                    },
                  }}
                  InputLabelProps={{ style: { color: reportErrors.type ? "#d32f2f" : "#00695C" } }}
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
                  error={!!reportErrors.description}
                  helperText={reportErrors.description || "Minimum 10 characters required"}
                  InputProps={{ readOnly: !isMobile }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      "& fieldset": { borderColor: reportErrors.description ? "#d32f2f" : "#00695C" },
                      "&:hover fieldset": { borderColor: reportErrors.description ? "#d32f2f" : "#00594A" },
                      "&.Mui-focused fieldset": { borderColor: reportErrors.description ? "#d32f2f" : "#00594A" },
                    },
                  }}
                  InputLabelProps={{ style: { color: reportErrors.description ? "#d32f2f" : "#00695C" } }}
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
              gap: isMobile ? 1.5 : 2,
              fontFamily: "inherit",
            }}
          >
            {visitorSent ? (
              <Alert severity="success" sx={{ 
                borderRadius: 2,
                fontSize: isMobile ? '13px' : '14px',
                padding: isMobile ? '6px 12px' : '8px 16px'
              }}>
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
                  error={!!visitorErrors.name}
                  helperText={visitorErrors.name}
                  InputProps={{ readOnly: !isMobile }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      "& fieldset": { borderColor: visitorErrors.name ? "#d32f2f" : "#00695C" },
                      "&:hover fieldset": { borderColor: visitorErrors.name ? "#d32f2f" : "#00594A" },
                      "&.Mui-focused fieldset": { borderColor: visitorErrors.name ? "#d32f2f" : "#00594A" },
                    },
                  }}
                  InputLabelProps={{ style: { color: visitorErrors.name ? "#d32f2f" : "#00695C" } }}
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
                  error={!!visitorErrors.address}
                  helperText={visitorErrors.address}
                  InputProps={{ readOnly: !isMobile }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      "& fieldset": { borderColor: visitorErrors.address ? "#d32f2f" : "#00695C" },
                      "&:hover fieldset": { borderColor: visitorErrors.address ? "#d32f2f" : "#00594A" },
                      "&.Mui-focused fieldset": { borderColor: visitorErrors.address ? "#d32f2f" : "#00594A" },
                    },
                  }}
                  InputLabelProps={{ style: { color: visitorErrors.address ? "#d32f2f" : "#00695C" } }}
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
                  error={!!visitorErrors.contact}
                  helperText={visitorErrors.contact || "e.g., +63 912 345 6789"}
                  InputProps={{ readOnly: !isMobile }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      "& fieldset": { borderColor: visitorErrors.contact ? "#d32f2f" : "#00695C" },
                      "&:hover fieldset": { borderColor: visitorErrors.contact ? "#d32f2f" : "#00594A" },
                      "&.Mui-focused fieldset": { borderColor: visitorErrors.contact ? "#d32f2f" : "#00594A" },
                    },
                  }}
                  InputLabelProps={{ style: { color: visitorErrors.contact ? "#d32f2f" : "#00695C" } }}
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
                    error={!!visitorErrors.timein}
                    helperText={visitorErrors.timein}
                    sx={{
                      flex: 1,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        fontFamily: "inherit",
                        "& fieldset": { borderColor: visitorErrors.timein ? "#d32f2f" : "#00695C" },
                        "&:hover fieldset": { borderColor: visitorErrors.timein ? "#d32f2f" : "#00594A" },
                        "&.Mui-focused fieldset": { borderColor: visitorErrors.timein ? "#d32f2f" : "#00594A" },
                      },
                      "& .MuiInputLabel-root": { 
                        color: visitorErrors.timein ? "#d32f2f" : "#00695C",
                        backgroundColor: "white",
                        padding: "0 4px",
                        "&.Mui-focused": { color: visitorErrors.timein ? "#d32f2f" : "#00594A" }
                      },
                    }}
                    InputLabelProps={{ 
                      style: { color: visitorErrors.timein ? "#d32f2f" : "#00695C" },
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
                    error={!!visitorErrors.timeout}
                    helperText={visitorErrors.timeout}
                    sx={{
                      flex: 1,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        fontFamily: "inherit",
                        "& fieldset": { borderColor: visitorErrors.timeout ? "#d32f2f" : "#00695C" },
                        "&:hover fieldset": { borderColor: visitorErrors.timeout ? "#d32f2f" : "#00594A" },
                        "&.Mui-focused fieldset": { borderColor: visitorErrors.timeout ? "#d32f2f" : "#00594A" },
                      },
                      "& .MuiInputLabel-root": { 
                        color: visitorErrors.timeout ? "#d32f2f" : "#00695C",
                        backgroundColor: "white",
                        padding: "0 4px",
                        "&.Mui-focused": { color: visitorErrors.timeout ? "#d32f2f" : "#00594A" }
                      },
                    }}
                    InputLabelProps={{ 
                      style: { color: visitorErrors.timeout ? "#d32f2f" : "#00695C" },
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
                  error={!!visitorErrors.feedback}
                  helperText={visitorErrors.feedback}
                  InputProps={{ readOnly: !isMobile }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      "& fieldset": { borderColor: visitorErrors.feedback ? "#d32f2f" : "#00695C" },
                      "&:hover fieldset": { borderColor: visitorErrors.feedback ? "#d32f2f" : "#00594A" },
                      "&.Mui-focused fieldset": { borderColor: visitorErrors.feedback ? "#d32f2f" : "#00594A" },
                    },
                  }}
                  InputLabelProps={{ style: { color: visitorErrors.feedback ? "#d32f2f" : "#00695C" } }}
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
                  error={!!visitorErrors.services}
                  helperText={visitorErrors.services}
                  InputProps={{ readOnly: !isMobile }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      "& fieldset": { borderColor: visitorErrors.services ? "#d32f2f" : "#00695C" },
                      "&:hover fieldset": { borderColor: visitorErrors.services ? "#d32f2f" : "#00594A" },
                      "&.Mui-focused fieldset": { borderColor: visitorErrors.services ? "#d32f2f" : "#00594A" },
                    },
                  }}
                  InputLabelProps={{ style: { color: visitorErrors.services ? "#d32f2f" : "#00695C" } }}
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

