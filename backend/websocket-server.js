// Simple WebSocket server for real-time campus updates
const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const Logger = require('./utils/logger');

const logger = new Logger('WebSocket');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ 
  server,
  perMessageDeflate: false 
});

// Store connected clients
const clients = new Map();
let clientIdCounter = 0;

// Broadcast message to all clients
function broadcast(message) {
  const messageString = JSON.stringify(message);
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(messageString);
      } catch (error) {
        logger.error('Error sending message to client:', error);
      }
    }
  });
  
  logger.debug(`📡 Broadcasted: ${message.type}`);
}

// Send emergency alert
function sendEmergencyAlert(message, location = 'Campus-wide') {
  broadcast({
    type: 'emergency',
    payload: {
      id: Date.now(),
      message,
      location,
      severity: 'high',
      timestamp: new Date().toISOString()
    }
  });
}

// Send maintenance alert
function sendMaintenanceAlert(area, message, duration = 'TBD') {
  broadcast({
    type: 'maintenance',
    payload: {
      id: Date.now(),
      area,
      message,
      duration,
      timestamp: new Date().toISOString()
    }
  });
}

// Send new announcement
function sendAnnouncement(title, content, type = 'general') {
  broadcast({
    type: 'announcement',
    payload: {
      id: Date.now(),
      title,
      content,
      announcementType: type,
      timestamp: new Date().toISOString()
    }
  });
}

// Send campus event notification
function sendEventNotification(title, description, startTime, location) {
  broadcast({
    type: 'event',
    payload: {
      id: Date.now(),
      title,
      description,
      startTime,
      location,
      timestamp: new Date().toISOString()
    }
  });
}

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const clientId = ++clientIdCounter;
  const clientInfo = {
    id: clientId,
    ip: req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    connectedAt: new Date().toISOString()
  };
  
  clients.set(ws, clientInfo);
  logger.success(`✅ Client ${clientId} connected from ${clientInfo.ip}`);
  logger.info(`👥 Total clients: ${wss.clients.size}`);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    payload: {
      message: 'Connected to UDM Campus Real-time Updates',
      clientId: clientId,
      timestamp: new Date().toISOString()
    }
  }));

  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      logger.debug(`📨 Message from client ${clientId}:`, data.type);
      
      switch (data.type) {
        case 'client_info':
          // Store additional client info
          clients.get(ws).clientType = data.payload.type;
          break;
          
        case 'user_location':
          // Handle location updates (could be used for occupancy tracking)
          logger.debug(`📍 Location update from client ${clientId}:`, data.payload);
          break;
          
        case 'emergency_alert':
          // Emergency alert from client (e.g., panic button)
          logger.warn(`🚨 Emergency alert from client ${clientId}:`, data.payload);
          sendEmergencyAlert(data.payload.message, data.payload.location);
          break;
          
        case 'maintenance_report':
          // Maintenance issue reported
          logger.info(`🔧 Maintenance report from client ${clientId}:`, data.payload);
          sendMaintenanceAlert(data.payload.location, data.payload.description);
          break;
          
        default:
          logger.warn('Unknown message type:', data.type);
      }
      
    } catch (error) {
      logger.error(`Error parsing message from client ${clientId}:`, error);
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    clients.delete(ws);
    logger.info(`❌ Client ${clientId} disconnected`);
    logger.info(`👥 Total clients: ${wss.clients.size}`);
  });

  // Handle errors
  ws.on('error', (error) => {
    logger.error(`Error with client ${clientId}:`, error);
  });
});

// Simple HTTP endpoints for triggering updates (for testing)
app.use(express.json());

app.post('/api/broadcast/announcement', (req, res) => {
  const { title, content, type } = req.body;
  sendAnnouncement(title, content, type);
  res.json({ success: true, message: 'Announcement broadcasted' });
});

app.post('/api/broadcast/emergency', (req, res) => {
  const { message, location } = req.body;
  sendEmergencyAlert(message, location);
  res.json({ success: true, message: 'Emergency alert sent' });
});

app.post('/api/broadcast/maintenance', (req, res) => {
  const { area, message, duration } = req.body;
  sendMaintenanceAlert(area, message, duration);
  res.json({ success: true, message: 'Maintenance alert sent' });
});

app.post('/api/broadcast/event', (req, res) => {
  const { title, description, startTime, location } = req.body;
  sendEventNotification(title, description, startTime, location);
  res.json({ success: true, message: 'Event notification sent' });
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    server: 'UDM Campus WebSocket Server',
    status: 'running',
    connectedClients: wss.clients.size,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Demo endpoints for testing
app.get('/demo/emergency', (req, res) => {
  sendEmergencyAlert('Fire drill in progress. Please evacuate the building immediately.', 'Main Building');
  res.send('Emergency alert sent!');
});

app.get('/demo/announcement', (req, res) => {
  sendAnnouncement('New Campus Announcement', 'The library will have extended hours this week from 7 AM to 10 PM.', 'academic');
  res.send('Announcement sent!');
});

app.get('/demo/maintenance', (req, res) => {
  sendMaintenanceAlert('Computer Laboratory', 'Air conditioning system maintenance scheduled for tomorrow 2-4 PM.', '2 hours');
  res.send('Maintenance alert sent!');
});

// Start the server
const PORT = process.env.WEBSOCKET_PORT || 5001;
server.listen(PORT, () => {
  logger.success(`🚀 WebSocket Server running on port ${PORT}`);
  logger.info(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
  logger.info(`🌐 HTTP endpoint: http://localhost:${PORT}`);
  logger.info(`\n📋 Demo endpoints:`);
  logger.info(`   http://localhost:${PORT}/demo/emergency`);
  logger.info(`   http://localhost:${PORT}/demo/announcement`);
  logger.info(`   http://localhost:${PORT}/demo/maintenance`);
  logger.info(`   http://localhost:${PORT}/api/status\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.warn('🛑 Shutting down WebSocket server...');
  wss.close(() => {
    server.close(() => {
      logger.success('✅ WebSocket server shut down');
      process.exit(0);
    });
  });
});

// Send periodic test announcements (for demo)
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const testMessages = [
      { title: 'Campus Update', content: 'All systems are running normally.', type: 'general' },
      { title: 'Library Notice', content: 'New books available in the science section.', type: 'academic' },
      { title: 'Event Reminder', content: 'Student council meeting at 3 PM today.', type: 'events' }
    ];
    
    const randomMessage = testMessages[Math.floor(Math.random() * testMessages.length)];
    sendAnnouncement(randomMessage.title, randomMessage.content, randomMessage.type);
  }, 120000); // Every 2 minutes
}

module.exports = { wss, broadcast, sendEmergencyAlert, sendMaintenanceAlert, sendAnnouncement, sendEventNotification };
