require('dotenv').config();

const http = require('http');
const { createApp } = require('./app');
const { createCorsOptions } = require('./config/cors');
const { initSockets } = require('./sockets');
const db = require('./db');

const PORT = process.env.PORT || 3001;

async function startServer() {
  await db.initDb();

  const corsOptions = createCorsOptions();
  const app = createApp(corsOptions);
  const server = http.createServer(app);

  initSockets(server, app, corsOptions);

  server.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
