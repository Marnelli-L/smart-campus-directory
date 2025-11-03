// Real-time updates system for campus announcements and alerts
// Uses WebSockets for live communication

class RealTimeUpdates {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.listeners = {
      announcement: [],
      emergency: [],
      maintenance: [],
      event: [],
      navigation: []
    };
    this.isConnected = false;
  }

  // Initialize WebSocket connection
  connect(url = 'ws://localhost:5001') {
    try {
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected for real-time updates');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Send client info
        this.send('client_info', {
          type: 'campus_navigation',
          timestamp: new Date().toISOString()
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.isConnected = false;
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.attemptReconnect();
    }
  }

  // Handle incoming messages
  handleMessage(data) {
    const { type, payload } = data;
    
    switch (type) {
      case 'announcement':
        this.notifyListeners('announcement', payload);
        this.showNotification('📢 New Announcement', payload.title, 'info');
        break;
        
      case 'emergency':
        this.notifyListeners('emergency', payload);
        this.showNotification('🚨 EMERGENCY ALERT', payload.message, 'error');
        break;
        
      case 'maintenance':
        this.notifyListeners('maintenance', payload);
        this.showNotification('🔧 Maintenance Alert', payload.message, 'warning');
        break;
        
      case 'event':
        this.notifyListeners('event', payload);
        this.showNotification('📅 Campus Event', payload.title, 'info');
        break;
        
      case 'navigation_update':
        this.notifyListeners('navigation', payload);
        break;
        
      default:
        console.log('Unknown message type:', type);
    }
  }

  // Notify registered listeners
  notifyListeners(type, payload) {
    this.listeners[type].forEach(callback => {
      try {
        callback(payload);
      } catch (error) {
        console.error(`Error in ${type} listener:`, error);
      }
    });
  }

  // Show browser notification
  showNotification(title, message, type = 'info') {
    // Check for notification permission
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: message,
        icon: '/images/UDM_LOGO.png',
        badge: '/images/UDM_LOGO.png'
      });

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    } else if (Notification.permission !== 'denied') {
      // Request permission
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          this.showNotification(title, message, type);
        }
      });
    }

    // Also show in-app notification
    this.showInAppNotification(title, message, type);
  }

  // Show in-app notification
  showInAppNotification(title, message, type) {
    const colors = {
      info: { bg: '#e3f2fd', border: '#2196f3', text: '#1565c0' },
      warning: { bg: '#fff3e0', border: '#ff9800', text: '#e65100' },
      error: { bg: '#ffebee', border: '#f44336', text: '#c62828' },
      success: { bg: '#e8f5e8', border: '#4caf50', text: '#2e7d32' }
    };

    const color = colors[type] || colors.info;

    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${color.bg};
      border-left: 4px solid ${color.border};
      color: ${color.text};
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 400px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: slideInRight 0.3s ease-out;
    `;

    notification.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h4 style="margin: 0 0 8px 0; font-weight: bold; font-size: 14px;">${title}</h4>
          <p style="margin: 0; font-size: 13px; opacity: 0.9;">${message}</p>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: none; border: none; font-size: 18px; cursor: pointer; 
          color: ${color.text}; opacity: 0.7; margin-left: 12px;
        ">×</button>
      </div>
    `;

    // Add animation styles if not already present
    if (!document.querySelector('#real-time-notifications-styles')) {
      const styles = document.createElement('style');
      styles.id = 'real-time-notifications-styles';
      styles.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  // Subscribe to updates
  subscribe(type, callback) {
    if (this.listeners[type]) {
      this.listeners[type].push(callback);
    }
  }

  // Unsubscribe from updates
  unsubscribe(type, callback) {
    if (this.listeners[type]) {
      const index = this.listeners[type].indexOf(callback);
      if (index > -1) {
        this.listeners[type].splice(index, 1);
      }
    }
  }

  // Send message to server
  send(type, payload) {
    if (this.isConnected && this.ws) {
      try {
        this.ws.send(JSON.stringify({ type, payload }));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
      }
    } else {
      console.warn('WebSocket not connected, message not sent:', { type, payload });
    }
  }

  // Attempt to reconnect
  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  // Send user location update
  updateUserLocation(floor, position) {
    this.send('user_location', {
      floor,
      position,
      timestamp: new Date().toISOString()
    });
  }

  // Request emergency broadcast
  sendEmergencyAlert(message, location) {
    this.send('emergency_alert', {
      message,
      location,
      timestamp: new Date().toISOString(),
      severity: 'high'
    });
  }

  // Report maintenance issue
  reportMaintenance(issue, location, description) {
    this.send('maintenance_report', {
      issue,
      location,
      description,
      timestamp: new Date().toISOString(),
      status: 'reported'
    });
  }
}

// Create global instance
const realTimeUpdates = new RealTimeUpdates();

// Auto-connect on load (with fallback handling)
if (typeof window !== 'undefined') {
  // Try to connect, but don't fail if server is not running
  setTimeout(() => {
    try {
      realTimeUpdates.connect();
    } catch {
      console.log('WebSocket server not available, running in offline mode');
    }
  }, 1000);

  // Request notification permission on first user interaction
  document.addEventListener('click', () => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, { once: true });
}

export default realTimeUpdates;