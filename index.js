const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Ensure uploads directories exist
const uploadDirs = ['uploads/members', 'uploads/gallery', 'uploads/programmes', 'uploads/unit-uploads'];
for (const dir of uploadDirs) {
  const p = path.join(__dirname, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files as static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many login attempts. Please try again later.' }
});

// Routes
const authRoutes         = require('./routes/auth');
const unitRoutes         = require('./routes/units');
const memberRoutes       = require('./routes/members');
const programmeRoutes    = require('./routes/programmes');
const announcementRoutes = require('./routes/announcements');
const galleryRoutes      = require('./routes/gallery');
const bloodRoutes        = require('./routes/blood');
const uploadsRoutes      = require('./routes/uploads');
const leaderboardRoutes  = require('./routes/leaderboard');
const scoresRoutes       = require('./routes/scores');

app.use('/api/auth',          authLimiter, authRoutes);
app.use('/api/units',         unitRoutes);
app.use('/api/members',       memberRoutes);
app.use('/api/programmes',    programmeRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/gallery',       galleryRoutes);
app.use('/api/blood',         bloodRoutes);
app.use('/api/uploads',       uploadsRoutes);
app.use('/api/leaderboard',   leaderboardRoutes);
app.use('/api/scores',        scoresRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date(), db: 'sqlite' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5001;

// Express 5: app.listen returns a Promise — must await to keep event loop alive
(async () => {
  await app.listen(PORT);
  console.log(`🚀 Server running on port ${PORT} (SQLite)`);
})();

module.exports = app;
