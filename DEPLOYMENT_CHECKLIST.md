# Quick Deployment Checklist

Use this to track your deployment progress:

## Prerequisites

- [ ] Install Git from https://git-scm.com/download/win
- [ ] Verify Node.js is installed: `node --version`
- [ ] Create GitHub account at https://github.com/signup
- [ ] Get Mapbox token from https://account.mapbox.com

## GitHub Setup

- [ ] Create new repository: https://github.com/new
- [ ] Name it: `smart-campus-directory`
- [ ] Set to PUBLIC
- [ ] Run in PowerShell:
  ```powershell
  cd c:\smart-campus-directory
  git init
  git add .
  git commit -m "Initial commit"
  git remote add origin https://github.com/YOUR_USERNAME/smart-campus-directory.git
  git branch -M main
  git push -u origin main
  ```

## Render Backend Deployment

- [ ] Sign up at https://render.com with GitHub
- [ ] Create PostgreSQL database (New + → PostgreSQL)
  - Name: `smart-campus-db`
  - Plan: Free
  - Copy Internal Database URL: postgresql://smart_campus_db_dc3v_user:sc422wAULkxfjymRa2Ix2zoG4A14qgcN@dpg-d44fa8k9c44c73bkvjk0-a/smart_campus_db_dc3v
- [ ] Create Web Service (New + → Web Service)
  - Connect GitHub repo
  - Root Directory: `backend`
  - Build: `npm install`
  - Start: `node server.js`
  - Plan: Free
- [ ] Add Environment Variables:
  - `DATABASE_URL`: [paste database URL]
  - `PORT`: 5000
  - `NODE_ENV`: production
- [ ] Wait for deployment (~5 min)
- [ ] Copy backend URL: ******\_\_\_******

## Vercel Frontend Deployment

- [ ] Update `frontend/.env.production`:
  - VITE_API_URL: [your Render backend URL]
  - VITE_MAPBOX_TOKEN: [your Mapbox token]
  - VITE_WS_URL: wss://[your backend URL without https://]
- [ ] Commit changes:
  ```powershell
  git add frontend/.env.production
  git commit -m "Add production config"
  git push
  ```
- [ ] Install Vercel CLI: `npm install -g vercel`
- [ ] Deploy:
  ```powershell
  cd c:\smart-campus-directory\frontend
  vercel
  ```
- [ ] Deploy to production: `vercel --prod`
- [ ] Copy production URL: ******\_\_\_******

## Vercel Environment Variables

- [ ] Go to https://vercel.com/dashboard
- [ ] Select your project → Settings → Environment Variables
- [ ] Add:
  - `VITE_API_URL`: [backend URL]
  - `VITE_MAPBOX_TOKEN`: [token]
  - `VITE_WS_URL`: [websocket URL]
- [ ] Redeploy: `vercel --prod`

## Testing

- [ ] Open frontend URL in browser
- [ ] Test search functionality
- [ ] Check map loads correctly
- [ ] Test on mobile device
- [ ] Test pathfinding (if corridors are set up)

## Your Live URLs

Frontend: **************\_\_\_\_**************
Backend: **************\_\_\_\_**************

## Done! 🎉

Share your frontend URL with anyone - it's live!
