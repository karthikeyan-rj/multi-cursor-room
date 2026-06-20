# Multiplayer Cursor Room

Multiplayer Cursor Room is a real-time collaborative workspace where users can create private rooms and work together using live cursors, a shared drawing canvas, sticky notes, and chat. The project focuses on smooth real-time interaction, room-based collaboration, and persistent workspace data.

## Features

* User registration and login
* Create and join collaboration rooms
* Password-protected rooms
* Unique room ID for joining rooms
* Real-time cursor tracking
* Shared drawing canvas
* Sticky notes inside rooms
* Real-time room chat
* Room-based access control
* Persistent data storage
* Responsive glass-style user interface

## Tech Stack

**Frontend:** React, Vite, CSS
**Backend:** Node.js, Express.js, Socket.IO
**Database:** MongoDB Atlas
**Authentication:** JSON Web Token
**Deployment:** Vercel and Render
**Version Control:** Git and GitHub

## Project Structure

```text
multi-cursor-room/
├── client/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── index.js
│   ├── db.js
│   └── package.json
└── README.md
```

## How It Works

A user can sign up, log in, and create a collaboration room with a password. Each room gets a unique room ID, which can be shared with others. Users can join the room using the room ID and password.

Inside the room, all connected users can see each other's cursors in real time, draw on a shared canvas, add sticky notes, and communicate through chat. Room data is stored in MongoDB so the workspace can be preserved even after users leave.

## Local Setup

Clone the repository:

```bash
git clone https://github.com/karthikeyan-rj/multi-cursor-room.git
cd multi-cursor-room
```

Install frontend dependencies:

```bash
cd client
npm install
```

Install backend dependencies:

```bash
cd ../server
npm install
```

Create a `.env` file inside the `server` folder:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
PORT=5000
```

Create a `.env` file inside the `client` folder:

```env
VITE_API_URL=http://localhost:5000
```

Run the backend:

```bash
cd server
npm start
```

Run the frontend:

```bash
cd client
npm run dev
```

## Deployment

The frontend is deployed on Vercel and the backend is deployed on Render. MongoDB Atlas is used as the cloud database.

## Author

Karthikeyan R J
