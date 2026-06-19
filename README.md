````markdown
# Multiplayer Cursor Room

A real-time collaborative workspace where users can create or join rooms and collaborate through live cursor tracking, a shared drawing canvas, sticky notes, room-based chat, and emoji reactions. The application uses Socket.IO for real-time communication and MongoDB Atlas for persistent data storage.

## Live Demo

**Frontend:** https://multi-cursor-room.vercel.app

**Backend:** https://multi-cursor-room.onrender.com

## Features

- User registration and login with JWT authentication
- Create and join collaboration rooms
- Real-time cursor tracking
- Shared drawing canvas
- Sticky notes with live synchronization
- Room-based chat
- Emoji reactions
- Persistent storage using MongoDB Atlas

## Tech Stack

### Frontend

- React
- Vite
- Socket.IO Client
- HTML5 Canvas
- CSS

### Backend

- Node.js
- Express
- Socket.IO
- MongoDB Atlas
- JSON Web Token (JWT)

## Project Structure

```text
multiplayer-cursor-room
├── client
│   ├── src
│   ├── public
│   ├── package.json
│   └── .env.example
│
├── server
│   ├── index.js
│   ├── db.js
│   ├── package.json
│   └── .env.example
│
├── .gitignore
└── README.md
```

## Getting Started

### Clone the repository

```bash
git clone https://github.com/karthikeyan-rj/multi-cursor-room.git
cd multi-cursor-room
```

### Backend Setup

```bash
cd server
npm install
```

Create a `.env` file inside the `server` directory.

```env
MONGODB_URI=<your_mongodb_connection_string>
JWT_SECRET=<your_jwt_secret>
CLIENT_URL=http://localhost:5173
```

Start the backend.

```bash
npm start
```

### Frontend Setup

```bash
cd ../client
npm install
```

Create a `.env` file inside the `client` directory.

```env
VITE_SERVER_URL=http://localhost:5000
```

Start the frontend.

```bash
npm run dev
```

The application will be available at:

```
http://localhost:5173
```

## Deployment

### Frontend (Vercel)

Set the following environment variable:

```env
VITE_SERVER_URL=https://multi-cursor-room.onrender.com
```

### Backend (Render)

Set the following environment variables:

```env
MONGODB_URI=<your_mongodb_connection_string>
JWT_SECRET=<your_jwt_secret>
CLIENT_URL=https://multi-cursor-room.vercel.app
```

## Notes

- MongoDB Atlas is used for persistent data storage.
- Socket.IO powers all real-time features including cursor tracking, chat, drawing, sticky notes, and emoji reactions.
- The free Render instance may take a short time to wake up after inactivity.

## Author

**Karthikeyan**

GitHub: https://github.com/karthikeyan-rj
````
