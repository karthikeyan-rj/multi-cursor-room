const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('../config/jwt');

async function signup(req, res) {
  const { username, email, password, color } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ success: false, error: 'Username, email, and password are required' });
  }

  const cleanUsername = username.trim();
  if (cleanUsername.length < 3 || cleanUsername.length > 20) {
    return res.status(400).json({ success: false, error: 'Username must be between 3 and 20 characters' });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail.includes('@') || cleanEmail.startsWith('@') || cleanEmail.endsWith('@')) {
    return res.status(400).json({ success: false, error: 'Please enter a valid email address' });
  }

  const existingEmail = await db.getUserByEmail(cleanEmail);
  if (existingEmail) {
    return res.status(409).json({ success: false, error: 'This email is already registered. Try logging in instead.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userColor = color || '#FF6B6B';
  const user = await db.createUser(cleanUsername, cleanEmail, passwordHash, userColor);

  const token = jwt.sign({ userId: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({
    success: true,
    token,
    user: { userId: user.id, username: user.username, email: user.email, color: user.color }
  });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await db.getUserByEmail(cleanEmail);
  if (!user) {
    return res.status(400).json({ success: false, error: 'Invalid email or password' });
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    return res.status(400).json({ success: false, error: 'Invalid email or password' });
  }

  const token = jwt.sign({ userId: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    success: true,
    token,
    user: { userId: user.id, username: user.username, email: user.email, color: user.color }
  });
}

async function getMe(req, res) {
  const user = await db.getUserByEmail(req.user.email);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  res.json({
    success: true,
    user: { userId: user.id, username: user.username, email: user.email, color: user.color }
  });
}

async function updateColor(req, res) {
  const { color } = req.body;
  if (!color) {
    return res.status(400).json({ success: false, error: 'Color is required' });
  }
  const user = await db.updateUserColorByEmail(req.user.email, color);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  res.json({
    success: true,
    user: { userId: user.id, username: user.username, email: user.email, color: user.color }
  });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Current password and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
  }
  const user = await db.getUserByEmail(req.user.email);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!passwordMatch) {
    return res.status(400).json({ success: false, error: 'Current password is incorrect' });
  }
  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  await db.updateUserPassword(user.id, newPasswordHash);
  res.json({ success: true, message: 'Password changed successfully' });
}

async function updateProfile(req, res) {
  const { username, color } = req.body;
  if (!username && !color) {
    return res.status(400).json({ success: false, error: 'No fields to update' });
  }
  if (username && (username.trim().length < 3 || username.trim().length > 20)) {
    return res.status(400).json({ success: false, error: 'Username must be between 3 and 20 characters' });
  }
  const updates = {};
  if (username) updates.username = username.trim();
  if (color) updates.color = color;
  const user = await db.updateUserProfile(req.user.userId, updates);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  res.json({
    success: true,
    user: { userId: user.id, username: user.username, email: user.email, color: user.color }
  });
}

module.exports = { signup, login, getMe, updateColor, changePassword, updateProfile };
