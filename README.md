````markdown
# Multiplayer Cursor Room

A full-stack real-time collaborative workspace where users can create or join rooms and work together using live cursors, shared canvas, sticky notes, chat, and room-based collaboration tools.

## Features

- User authentication with login and registration
- Create and join collaborative rooms
- Password-protected rooms
- Unique room ID for joining rooms
- Real-time multi-user cursor tracking
- Shared drawing canvas
- Sticky notes inside rooms
- Real-time chat
- Room deletion with stored room data cleanup
- Responsive UI with animated glass-style design
- Persistent data storage using MongoDB Atlas

## Tech Stack

**Frontend:** React, Vite, CSS  
**Backend:** Node.js, Express, Socket.IO  
**Database:** MongoDB Atlas  
**Authentication:** JWT  
**Deployment:** Vercel, Render  
**Version Control:** Git, GitHub

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
````

## How It Works

Users can register or log in, create a protected room, and invite others using a unique room ID and password. Inside a room, users can collaborate in real time through cursor movement, drawing, sticky notes, and chat. Room data is stored persistently in MongoDB.

## Local Setup

### Clone the repository

```bash
git clone https://github.com/karthikeyan-rj/multi-cursor-room.git
cd multi-cursor-room
```

### Install frontend dependencies

```bash
cd client
npm install
```

### Install backend dependencies

```bash
cd ../server
npm install
```

### Configure environment variables

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

### Run the backend

```bash
cd server
npm start
```

### Run the frontend

```bash
cd client
npm run dev
```

## Deployment

* Frontend deployed on Vercel
* Backend deployed on Render
* Database hosted on MongoDB Atlas

## Author

Karthikeyan R J

```
```
