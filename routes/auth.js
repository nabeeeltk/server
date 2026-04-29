const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  try {
    const user = db.prepare(
      'SELECT u.*, un.unit_name FROM users u LEFT JOIN units un ON u.unit_id = un.id WHERE u.username = ?'
    ).get(username);

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, role: user.role, unit_id: user.unit_id },
      process.env.JWT_SECRET || 'panchayat_secret_key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        unit_id: user.unit_id,
        unit_name: user.unit_name
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', verifyToken, (req, res) => {
  try {
    const user = db.prepare(
      'SELECT u.id, u.username, u.role, u.unit_id, un.unit_name, un.unit_number FROM users u LEFT JOIN units un ON u.unit_id = un.id WHERE u.id = ?'
    ).get(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
