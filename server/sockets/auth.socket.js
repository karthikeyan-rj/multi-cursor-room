const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');

function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) {
    socket.user = null;
    return next();
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      socket.user = null;
      return next();
    }
    socket.user = {
      userId: decoded.userId,
      username: decoded.username || decoded.name || decoded.displayName || '',
      email: decoded.email || ''
    };
    next();
  });
}

module.exports = { socketAuthMiddleware };
