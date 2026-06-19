# Multiplayer Cursor Room

A real-time multiplayer collaborative workspace where users can draw on a shared canvas, place sticky notes, and chat — all with live cursor tracking.

## Features

- 🖱️ **Live Cursors** — See every connected user's cursor in real time
- 🎨 **Shared Canvas** — Draw collaboratively with brush color and size controls
- 🗒️ **Sticky Notes** — Add, drag, edit, and delete sticky notes synced for all users
- 💬 **Chat** — Room-scoped live chat with message history
- 🎭 **Emoji Reactions** — Floating emoji reactions visible to everyone
- 🔐 **Auth** — JWT-based sign-up / login with persistent color profiles
- 🏠 **Rooms** — Create and join multiple named collaboration rooms
- ☁️ **MongoDB Atlas** — Persistent storage via MongoDB Atlas free tier

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Real-time | Socket.io |
| Database | MongoDB Atlas |
| Auth | JWT (jsonwebtoken) |

## Project Structure

```
multiplayer-cursor-room/
├── client/          # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx  # Main app component
│   │   └── index.css
│   └── .env         # VITE_SERVER_URL (create from .env.example)
└── server/          # Node.js backend
    ├── index.js     # Express + Socket.io server
    ├── db.js        # MongoDB data layer
    └── .env         # MONGODB_URI, JWT_SECRET, etc. (create from .env.example)
```

## Local Development Setup

### Prerequisites
- Node.js 18+
- A [MongoDB Atlas](https://www.mongodb.com/atlas) free-tier cluster (or local MongoDB)

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/multiplayer-cursor-room.git
cd multiplayer-cursor-room
```

### 2. Set up the server

```bash
cd server
npm install
cp .env.example .env
# Edit .env and set your MONGODB_URI and JWT_SECRET
```

### 3. Set up the client

```bash
cd ../client
npm install
cp .env.example .env
# Edit .env — set VITE_SERVER_URL=http://localhost:3001 for local dev
```

### 4. Run locally

Open two terminals:

```bash
# Terminal 1 — Backend
cd server && node index.js

# Terminal 2 — Frontend
cd client && npm run dev
```

Visit `http://localhost:5173`

## Deployment

### Backend (Render / Railway / Fly.io)

Set these environment variables on your hosting platform:

| Variable | Description |
|---|---|
| `PORT` | Port to listen on (usually set automatically) |
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | A strong random secret string |
| `ALLOWED_ORIGINS` | Comma-separated list of your frontend URL(s) |

**Start command:** `node index.js`

### Frontend (Vercel / Netlify)

Set this environment variable at build time:

| Variable | Description |
|---|---|
| `VITE_SERVER_URL` | Full URL of your deployed backend |

**Build command:** `npm run build`  
**Publish directory:** `dist`
