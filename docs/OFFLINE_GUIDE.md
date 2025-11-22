# Offline Functionality Guide

## Overview

The UDM Smart Campus Directory system is now a Progressive Web App (PWA) with full offline support. Users can access the campus map, directory, and cached announcements even without internet connection.

## Features

### 1. **Offline Access**

- Campus maps (all floors) are cached and available offline
- Directory information cached for offline browsing
- Last viewed announcements available offline
- UI remains fully functional without internet

### 2. **Service Worker Caching**

The system uses a multi-layer caching strategy:

**Static Cache** (`udm-static-v1.1`):

- HTML, CSS, JavaScript files
- Images (logos, icons)
- Audio files (Lio greeting)
- Essential UI assets

**Map Cache** (`udm-maps-v1`):

- `smart-campus-map.geojson` (main campus map)
- `2nd-floor-map.geojson`
- `3rd-floor-map.geojson`
- `4th-floor-map.geojson`

**Dynamic Cache** (`udm-dynamic-v1.1`):

- API responses (announcements, buildings, feedback)
- User-requested data
- Search results

### 3. **Offline Indicators**

- **Persistent Banner**: Shows at top of screen when offline (amber color)
- **Online Notification**: Green popup when connection is restored
- **Real-time Status**: Automatically detects connection changes

### 4. **PWA Installation**

Users can install the app on their devices:

**Desktop (Chrome/Edge)**:

1. Click the install icon in address bar
2. Or: Settings → Install UDM Campus Directory

**Mobile (Android)**:

1. Tap browser menu (⋮)
2. Select "Add to Home Screen" or "Install app"
3. Confirm installation

**iOS (Safari)**:

1. Tap Share button
2. Select "Add to Home Screen"
3. Name the app and tap "Add"

### 5. **Offline Capabilities**

**✅ Works Offline:**

- View all campus maps with full navigation
- Search directory (cached entries)
- View Lio chatbot (cached knowledge base)
- Browse last loaded announcements
- Navigate between pages
- Use search functionality with cached data

**⚠️ Requires Internet:**

- Submit new feedback/reports
- Load fresh announcements
- Admin login and dashboard
- Upload images
- Real-time updates

### 6. **Data Synchronization**

When connection is restored:

- Service worker automatically syncs pending submissions
- Fresh announcements are loaded
- Cached data is updated in background
- User receives notification when back online

## Technical Implementation

### Service Worker Registration

Registered in `main.jsx`:

```javascript
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register("/sw.js", { scope: "/" });
}
```

### Cache Strategy

- **Cache First**: Static assets (images, maps)
- **Network First**: API calls (with cache fallback)
- **Stale While Revalidate**: Dynamic content

### Update Mechanism

- Service worker checks for updates on page load
- Prompts user to refresh when new version available
- Automatic cache cleanup of old versions

## Testing Offline Mode

### Chrome DevTools

1. Open DevTools (F12)
2. Go to "Network" tab
3. Change throttling to "Offline"
4. Reload page - everything should work!

### Real Device

1. Enable airplane mode
2. Open the app
3. Navigate and use features
4. All cached content should be accessible

## Manifest Configuration

Located at `/public/manifest.json`:

- **Name**: UDM Smart Campus Directory
- **Short Name**: UDM Campus
- **Display**: Standalone (fullscreen app experience)
- **Theme Color**: #00594A (UDM green)
- **Icons**: 192x192 and 512x512 PNG
- **Shortcuts**: Quick access to Map and Directory

## Browser Support

✅ **Full Support:**

- Chrome 90+ (Desktop & Mobile)
- Edge 90+
- Safari 14+ (iOS & macOS)
- Firefox 88+
- Samsung Internet 14+

⚠️ **Limited Support:**

- Internet Explorer (not supported)
- Older mobile browsers

## Performance Benefits

### Online:

- Faster page loads (cached assets)
- Reduced server load
- Better user experience

### Offline:

- Full map functionality
- Directory access
- Chatbot interaction
- No "no internet" errors

## Cache Management

### Automatic:

- Old caches deleted on service worker activation
- Cache size managed by browser
- LRU (Least Recently Used) eviction policy

### Manual Clear:

**Chrome DevTools:**

1. Application tab → Storage
2. Clear storage for the site

**User Settings:**
Browser → Settings → Clear browsing data → Cached images and files

## Troubleshooting

### Issue: Updates not showing

**Solution**:

- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Clear cache and reload
- Unregister service worker in DevTools

### Issue: Offline mode not working

**Solution**:

- Check if service worker is registered (DevTools → Application)
- Verify HTTPS (required for service workers)
- Check browser console for errors

### Issue: Cache taking too much space

**Solution**:

- Browser automatically manages cache size
- Manually clear cache in browser settings
- Service worker only caches essential files

## Best Practices for Users

1. **First Load Online**: Load the app while online first to cache all resources
2. **Regular Updates**: Connect online periodically for fresh data
3. **Install as App**: Install PWA for best offline experience
4. **Enable Notifications**: Get alerts when back online

## Development Notes

### Disabling Service Worker

For development, service worker only registers in production:

```javascript
if (import.meta.env.PROD) {
  // Register service worker
}
```

### Force Update

Delete service worker caches:

```javascript
caches.keys().then((names) => {
  names.forEach((name) => caches.delete(name));
});
```

### Cache Version

Update version numbers in `sw.js` when deploying changes:

```javascript
const CACHE_NAME = "udm-campus-v1.1.0"; // Increment version
```

## Future Enhancements

- **Background Sync**: Queue feedback submissions when offline
- **Push Notifications**: Campus alerts and announcements
- **Periodic Sync**: Auto-update announcements in background
- **IndexedDB**: Store more complex offline data
- **Offline Analytics**: Track offline usage patterns

## Security Considerations

- Service worker only works over HTTPS
- Cache is isolated per origin
- No sensitive data cached (passwords, tokens)
- Admin routes not cached for security

## Monitoring

Check service worker status:

```javascript
navigator.serviceWorker.ready.then((registration) => {
  console.log("Service Worker ready:", registration.scope);
});
```

## Support

For issues or questions about offline functionality:

- Check browser console for service worker logs
- Review Network tab for failed requests
- Contact IT support with error details

---

**Version**: 1.1.0  
**Last Updated**: November 5, 2025  
**Platform**: Progressive Web App (PWA)
