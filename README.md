# Smart Campus Navigation System

A comprehensive indoor/outdoor navigation system with real-time pathfinding, directory services, and campus information.

## Features

- 🗺️ Interactive campus map with Mapbox GL
- 🔍 Smart search with fuzzy matching
- 🧭 A\* pathfinding with corridor-only routing
- 📱 Mobile-responsive PWA
- 🏢 Multi-floor navigation
- 📢 Announcements and emergency alerts
- 💬 LIO AI Assistant
- 📝 Feedback reporting system

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Map**: Mapbox GL JS
- **Pathfinding**: Turf.js + A\* Algorithm

## Live Demo

- Frontend: [Your Vercel URL]
- Backend API: [Your Render URL]

## Deployment

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Mapbox account (free tier works)

### Frontend (Vercel)

```bash
cd frontend
npm install
npm run build
vercel --prod
```

### Backend (Render)

- Connect GitHub repository
- Auto-deploys from `backend/` directory
- PostgreSQL database included

## Environment Variables

### Frontend (.env.production)

```env
VITE_API_URL=https://your-backend.onrender.com
VITE_MAPBOX_TOKEN=your_mapbox_token
VITE_WS_URL=wss://your-backend.onrender.com
```

### Backend (Render)

```env
DATABASE_URL=postgresql://user:pass@host:5432/db
PORT=5000
NODE_ENV=production
```

## Local Development

### Backend

```bash
cd backend
npm install
node server.js
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
smart-campus-directory/
├── backend/
│   ├── server.js
│   ├── routes/
│   ├── db/
│   └── uploads/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── utils/
│   │   └── pages/
│   └── public/
│       └── images/
└── README.md
```

## License

MIT

## Contributors

Universidad de Manila - Smart Campus Team
