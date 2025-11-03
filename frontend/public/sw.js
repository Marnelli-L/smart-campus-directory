// Service Worker for UDM Smart Campus Directory PWA
// Provides offline functionality and caching

const CACHE_NAME = 'udm-campus-v1.0.0';
const STATIC_CACHE = 'udm-static-v1';
const DYNAMIC_CACHE = 'udm-dynamic-v1';

// Files to cache for offline use
const STATIC_FILES = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/src/App.jsx',
  '/src/App.css',
  '/src/index.css',
  '/images/UDM_LOGO.png',
  '/images/F1.svg',
  '/images/F2.svg',
  '/images/F3.svg',
  '/images/F4.svg',
  // Add your essential files here
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/announcements',
  '/api/buildings',
  '/api/admin'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📦 Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('✅ Service Worker: Static files cached');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Service Worker: Error caching static files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // Handle different types of requests
  if (request.method === 'GET') {
    if (isAPIRequest(request)) {
      event.respondWith(handleAPIRequest(request));
    } else if (isNavigationRequest(request)) {
      event.respondWith(handleNavigationRequest(request));
    } else if (isStaticAsset(request)) {
      event.respondWith(handleStaticAsset(request));
    }
  }
});

// Check if request is for API
function isAPIRequest(request) {
  return request.url.includes('/api/');
}

// Check if request is navigation (page load)
function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

// Check if request is for static asset
function isStaticAsset(request) {
  return request.destination === 'image' || 
         request.destination === 'script' || 
         request.destination === 'style' ||
         request.url.includes('.svg') ||
         request.url.includes('.png') ||
         request.url.includes('.jpg') ||
         request.url.includes('.css') ||
         request.url.includes('.js');
}

// Handle API requests with cache-first strategy for offline support
async function handleAPIRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('📡 Service Worker: Network failed, checking cache for:', request.url, error);
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('💾 Service Worker: Serving from cache:', request.url);
      
      // Add offline indicator to response
      const response = cachedResponse.clone();
      const body = await response.text();
      
      try {
        const data = JSON.parse(body);
        data._offline = true;
        data._cachedAt = new Date().toISOString();
        
        return new Response(JSON.stringify(data), {
          headers: { ...response.headers, 'Content-Type': 'application/json' }
        });
      } catch {
        return cachedResponse;
      }
    }
    
    // Return offline fallback for API
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'This feature requires internet connection',
      _offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch {
    console.log('📡 Service Worker: Navigation offline, serving cached page');
    
    // Serve cached index.html for all navigation requests when offline
    const cachedResponse = await caches.match('/index.html');
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  // Check cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // Fetch from network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the response
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch {
    console.log('❌ Service Worker: Failed to load asset:', request.url);
    
    // Return offline placeholder for images
    if (request.destination === 'image') {
      return new Response('', { status: 503 });
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Background sync for offline data
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync triggered');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineData());
  }
});

// Sync offline data when connection is restored
async function syncOfflineData() {
  try {
    console.log('📡 Service Worker: Syncing offline data...');
    
    // Get offline reports from IndexedDB (if any)
    const offlineReports = await getOfflineReports();
    
    for (const report of offlineReports) {
      try {
        await fetch('/api/maintenance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report)
        });
        
        // Remove from offline storage after successful sync
        await removeOfflineReport(report.id);
        console.log('✅ Synced offline report:', report.id);
      } catch (error) {
        console.error('❌ Failed to sync report:', report.id, error);
      }
    }
    
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

// IndexedDB helpers for offline storage
async function getOfflineReports() {
  // Simplified - you would implement IndexedDB logic here
  return [];
}

async function removeOfflineReport(id) {
  // Simplified - you would implement IndexedDB removal here
  console.log('Removed offline report:', id);
}

// Push notifications for real-time updates
self.addEventListener('push', (event) => {
  console.log('📢 Service Worker: Push notification received');
  
  const options = {
    body: 'You have new campus updates',
    icon: '/images/UDM_LOGO.png',
    badge: '/images/UDM_LOGO.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'View Updates',
        icon: '/images/UDM_LOGO.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/images/UDM_LOGO.png'
      }
    ]
  };

  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.title = data.title || 'Campus Update';
  }

  event.waitUntil(
    self.registration.showNotification('UDM Campus Directory', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Service Worker: Notification clicked');
  
  event.notification.close();

  if (event.action === 'explore') {
    // Open the app
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

// Handle message from main thread
self.addEventListener('message', (event) => {
  console.log('💌 Service Worker: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Periodic background fetch for updates (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'campus-updates') {
    event.waitUntil(fetchCampusUpdates());
  }
});

async function fetchCampusUpdates() {
  try {
    const response = await fetch('/api/announcements');
    const announcements = await response.json();
    
    // Store latest announcements for offline access
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put('/api/announcements', new Response(JSON.stringify(announcements)));
    
    console.log('📱 Service Worker: Campus updates fetched in background');
  } catch (error) {
    console.error('❌ Failed to fetch campus updates:', error);
  }
}

console.log('🚀 Service Worker: Loaded and ready');