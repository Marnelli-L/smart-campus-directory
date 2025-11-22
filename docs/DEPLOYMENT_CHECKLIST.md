# 🚀 DEPLOYMENT CHECKLIST

## Pre-Deployment Verification

### 🔐 Security
- [ ] **DATABASE_URL**: Set in environment (no hardcoded passwords)
- [ ] **JWT_SECRET**: Generated unique secret for production
- [ ] **Admin Password**: Changed from default "admin"
- [ ] **Environment Variables**: All secrets in .env (not committed to git)
- [ ] **CORS**: Production domains added to allowed origins
- [ ] **HTTPS**: Enabled (automatic on Render/Vercel)
- [ ] **Rate Limiting**: Enabled and configured
- [ ] **Helmet.js**: Security headers added
- [ ] **bcrypt**: Password hashing working
- [ ] **Input Validation**: All routes validated

### 📦 Backend (Render)
- [ ] **Dependencies**: `npm install` runs successfully
- [ ] **Build**: No errors in `npm start`
- [ ] **Database**: PostgreSQL connected and tables created
- [ ] **Admin User**: Created with hashed password (`node create-admin.js`)
- [ ] **Health Check**: `/api/health` endpoint responds
- [ ] **CORS**: Frontend domain in allowed origins
- [ ] **Logs**: Check Render logs for errors
- [ ] **Environment**: All required env vars set in Render dashboard

### 🎨 Frontend (Vercel)
- [ ] **Build**: `npm run build` completes without errors
- [ ] **VITE_API_URL**: Points to production backend
- [ ] **VITE_MAPBOX_TOKEN**: Valid Mapbox token set
- [ ] **Bundle Size**: Under 1MB (check with `npm run build`)
- [ ] **Lighthouse**: Score 90+ for Performance
- [ ] **PWA**: Service worker registers correctly
- [ ] **Routes**: All lazy-loaded routes work
- [ ] **Error Boundaries**: Catch errors without crashing
- [ ] **Mobile**: Responsive on all screen sizes

### 🧪 Testing
- [ ] **Login**: Admin login works with bcrypt password
- [ ] **CRUD**: All create/read/update/delete operations work
- [ ] **Map**: Map loads with correct tiles
- [ ] **Search**: Directory search returns results
- [ ] **Navigation**: Multi-floor pathfinding works
- [ ] **Announcements**: Display and CRUD work
- [ ] **Feedback**: Forms submit successfully
- [ ] **File Upload**: Images upload correctly
- [ ] **Offline**: PWA works offline
- [ ] **Mobile**: Test on actual mobile device

### 📊 Performance
- [ ] **Initial Load**: Under 3 seconds
- [ ] **Code Splitting**: Routes load on demand
- [ ] **Images**: Optimized and compressed
- [ ] **Caching**: Service worker caches assets
- [ ] **Database**: Indexes on frequently queried columns

### 📝 Documentation
- [ ] **README**: Updated with production URLs
- [ ] **API Docs**: Endpoints documented
- [ ] **Setup Guide**: Clear deployment instructions
- [ ] **Environment Guide**: All env vars documented
- [ ] **.env.example**: Updated with all variables

## Deployment Steps

### Backend (Render)

1. **Create PostgreSQL Database**
   ```
   - Go to Render Dashboard
   - New → PostgreSQL
   - Copy DATABASE_URL
   ```

2. **Create Web Service**
   ```
   - New → Web Service
   - Connect GitHub repo
   - Root Directory: backend
   - Build Command: npm install
   - Start Command: node server.js
   ```

3. **Set Environment Variables**
   ```
   DATABASE_URL=<from step 1>
   NODE_ENV=production
   JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
   ALLOWED_ORIGINS=https://your-app.vercel.app
   ```

4. **Initialize Database**
   ```bash
   # In Render Shell or locally with production DATABASE_URL
   node create-admin.js
   node initialize-render-db.js
   ```

5. **Verify**
   ```
   - Visit: https://your-backend.onrender.com/api/health
   - Should return: {"status":"OK",...}
   ```

### Frontend (Vercel)

1. **Create New Project**
   ```
   - Go to Vercel Dashboard
   - Import Git Repository
   - Root Directory: frontend
   - Framework: Vite
   ```

2. **Set Environment Variables**
   ```
   VITE_API_URL=https://your-backend.onrender.com
   VITE_MAPBOX_TOKEN=<your mapbox token>
   VITE_WS_URL=wss://your-backend.onrender.com
   ```

3. **Deploy**
   ```
   - Click "Deploy"
   - Wait for build to complete
   ```

4. **Update Backend CORS**
   ```
   - Go back to Render
   - Add Vercel URL to ALLOWED_ORIGINS
   - Example: https://your-app.vercel.app
   ```

5. **Verify**
   ```
   - Visit your Vercel URL
   - Test login, map, search
   - Check browser console for errors
   ```

## Post-Deployment

### Monitoring
- [ ] **Error Tracking**: Set up Sentry (optional)
- [ ] **Uptime Monitoring**: Set up UptimeRobot (optional)
- [ ] **Analytics**: Google Analytics configured (optional)
- [ ] **Logs**: Check Render logs daily for first week

### Maintenance
- [ ] **Backups**: Database backup schedule
- [ ] **Updates**: Plan for dependency updates
- [ ] **Security**: npm audit monthly
- [ ] **Performance**: Monitor bundle size

### Rollback Plan
```bash
# If deployment fails:
1. Revert to previous commit
2. Redeploy from Vercel/Render dashboard
3. Check environment variables
4. Review logs for errors
```

## Common Issues & Solutions

### Backend Not Starting
```
Problem: DATABASE_URL not set
Solution: Add DATABASE_URL in Render environment variables
```

### CORS Errors
```
Problem: Frontend can't connect to backend
Solution: Add Vercel domain to ALLOWED_ORIGINS in backend
```

### Build Fails
```
Problem: npm install fails
Solution: Delete node_modules and package-lock.json, reinstall
```

### Images Not Loading
```
Problem: Uploaded images return 404
Solution: Ensure uploads/ directory exists, check file permissions
```

### Map Not Showing
```
Problem: Mapbox token invalid
Solution: Verify VITE_MAPBOX_TOKEN is set correctly
```

## Success Criteria

✅ Backend health check responds
✅ Frontend loads without console errors
✅ Admin login works
✅ Map displays correctly
✅ Search returns results
✅ Navigation works
✅ Forms submit successfully
✅ Mobile responsive
✅ PWA installable
✅ No security warnings

## 🎉 You're Live!

Once all checks pass, your Smart Campus Directory is production-ready!

**Share your links:**
- Frontend: https://your-app.vercel.app
- Backend API: https://your-backend.onrender.com

**Remember:**
- Change admin password immediately
- Monitor logs for the first week
- Set up automated backups
- Keep dependencies updated
