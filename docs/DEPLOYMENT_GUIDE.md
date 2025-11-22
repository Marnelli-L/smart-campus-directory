# 🚀 DEPLOYMENT GUIDE - Smart Campus Navigation System

Follow these steps to deploy your system to the internet (FREE hosting)

---

## STEP 1: Install Required Tools (5 minutes)

### Install Git

1. Download: https://git-scm.com/download/win
2. Run installer → Use default settings
3. Restart PowerShell

### Install Node.js (if not installed)

1. Download: https://nodejs.org (LTS version)
2. Run installer
3. Verify: Open PowerShell and run:
   ```powershell
   node --version
   npm --version
   ```

---

## STEP 2: Push Code to GitHub (5 minutes)

### Create GitHub Account

1. Go to https://github.com/signup
2. Create free account

### Create Repository

1. Go to https://github.com/new
2. Repository name: `smart-campus-directory`
3. **Keep it PUBLIC** (required for free hosting)
4. Don't initialize with README (we have one)
5. Click "Create repository"

### Push Your Code

Open PowerShell in your project folder and run:

```powershell
cd c:\smart-campus-directory

# Initialize Git
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit - Smart Campus System"

# Link to GitHub (REPLACE with YOUR username)
git remote add origin https://github.com/YOUR_USERNAME/smart-campus-directory.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Note**: GitHub will ask for authentication:

- Username: your GitHub username
- Password: Create a Personal Access Token:
  1. Go to https://github.com/settings/tokens
  2. Generate new token (classic)
  3. Select: `repo` scope
  4. Copy token and use as password

---

## STEP 3: Deploy Backend on Render (8 minutes)

### Create Render Account

1. Go to https://render.com
2. Click "Get Started for Free"
3. **Sign up with GitHub** (easiest option)

### Create PostgreSQL Database

1. In Render Dashboard, click **"New +"**
2. Select **"PostgreSQL"**
3. Settings:
   - Name: `smart-campus-db`
   - Database: `smart_campus`
   - User: `smart_campus_user`
   - Region: Choose closest to you
   - Plan: **Free**
4. Click **"Create Database"**
5. Wait ~2 minutes for provisioning
6. **COPY the "Internal Database URL"** (you'll need this)
   - It looks like: `postgresql://user:pass@host/database`

### Deploy Backend Service

1. Click **"New +"** → **"Web Service"**
2. Click **"Connect GitHub"** → Authorize Render
3. Select your `smart-campus-directory` repository
4. Settings:
   - **Name**: `smart-campus-backend`
   - **Region**: Same as database
   - **Root Directory**: `backend`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free
5. Click **"Advanced"** → Add Environment Variables:
   ```
   DATABASE_URL = [paste the Internal Database URL from step 6]
   PORT = 5000
   NODE_ENV = production
   ```
6. Click **"Create Web Service"**
7. Wait ~5 minutes for deployment
8. **COPY your backend URL** from the top of the page
   - It looks like: `https://smart-campus-backend-xxxx.onrender.com`

---

## STEP 4: Deploy Frontend on Vercel (7 minutes)

### Update Backend URL

1. Open `c:\smart-campus-directory\frontend\.env.production`
2. Replace `VITE_API_URL` with your Render backend URL:
   ```env
   VITE_API_URL=https://smart-campus-backend-xxxx.onrender.com
   VITE_WS_URL=wss://smart-campus-backend-xxxx.onrender.com
   ```
3. Add your Mapbox token:
   ```env
   VITE_MAPBOX_TOKEN=pk.eyJ1...your_actual_token
   ```
4. Save the file

### Commit the Changes

```powershell
cd c:\smart-campus-directory
git add frontend/.env.production
git commit -m "Add production backend URL"
git push
```

### Install Vercel CLI

```powershell
npm install -g vercel
```

### Deploy to Vercel

```powershell
cd c:\smart-campus-directory\frontend
vercel
```

Follow the prompts:

- **Set up and deploy?** → Press **Y**
- **Which scope?** → Select your account
- **Link to existing project?** → Press **N**
- **Project name?** → `smart-campus` (or press Enter)
- **In which directory is your code?** → Press Enter (current directory)
- **Want to override settings?** → Press **N**

Wait ~2 minutes... You'll get a **Preview URL** like:

```
https://smart-campus-abcd1234.vercel.app
```

### Deploy to Production

```powershell
vercel --prod
```

You'll get your **Production URL**:

```
✅ https://smart-campus.vercel.app
```

---

## STEP 5: Configure Environment Variables in Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Click on your `smart-campus` project
3. Go to **Settings** → **Environment Variables**
4. Add these variables (for all environments):

   - **Name**: `VITE_API_URL`  
     **Value**: `https://smart-campus-backend-xxxx.onrender.com`

   - **Name**: `VITE_MAPBOX_TOKEN`  
     **Value**: `pk.eyJ1...` (your token)

   - **Name**: `VITE_WS_URL`  
     **Value**: `wss://smart-campus-backend-xxxx.onrender.com`

5. Click **Save**

### Redeploy with New Variables

```powershell
vercel --prod
```

---

## ✅ DONE! Your System is Live!

### Your URLs:

- **Frontend (Main App)**: `https://smart-campus.vercel.app`
- **Backend API**: `https://smart-campus-backend-xxxx.onrender.com`

### Test on Your Phone:

1. Open browser on phone
2. Go to your Vercel URL
3. It works! 🎉

---

## 🔄 Future Updates

When you make changes:

```powershell
cd c:\smart-campus-directory

# Make your changes...

# Commit and push
git add .
git commit -m "Description of changes"
git push

# For frontend changes, redeploy:
cd frontend
vercel --prod
```

**Render auto-deploys backend** on every push!

---

## 🆘 Troubleshooting

### Backend not connecting to database:

- Check `DATABASE_URL` in Render dashboard
- Make sure it's the **Internal Database URL**

### Frontend can't reach backend:

- Check CORS settings in `backend/server.js`
- Verify `VITE_API_URL` in Vercel environment variables

### Map not loading:

- Check `VITE_MAPBOX_TOKEN` is correct
- Verify token hasn't expired at mapbox.com

### Changes not showing:

- Hard refresh: `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac)
- Check Vercel deployment status
- Redeploy: `vercel --prod`

---

## 🎉 Congratulations!

Your Smart Campus Navigation System is now live and accessible worldwide!

**Free Forever Limits:**

- Vercel: 100GB bandwidth/month, unlimited projects
- Render: 750 hours/month (24/7 for free), 256MB database

**Need Help?**

- Vercel Docs: https://vercel.com/docs
- Render Docs: https://render.com/docs
- GitHub: Check your repository Issues tab
