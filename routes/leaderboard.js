const express = require('express');
const { db } = require('../db');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// GET /api/leaderboard
router.get('/', verifyToken, (req, res) => {
  try {
    // SQLite doesn't support RANK() window function in older versions; use subquery approach
    const units = db.prepare(`
      SELECT 
        u.id, u.unit_number, u.unit_name,
        COALESCE(SUM(us.score), 0) AS total_score,
        COUNT(DISTINCT CASE WHEN um.is_active = 1 THEN um.id END) AS member_count
      FROM units u
      LEFT JOIN unit_scores us ON us.unit_id = u.id
      LEFT JOIN unit_members um ON um.unit_id = u.id
      GROUP BY u.id
      ORDER BY total_score DESC, u.unit_number ASC
    `).all();

    // Add rank manually
    const ranked = units.map((u, idx) => ({ ...u, rank: idx + 1 }));
    res.json(ranked);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/leaderboard/:programmeId
router.get('/:programmeId', verifyToken, (req, res) => {
  const { programmeId } = req.params;
  try {
    const units = db.prepare(`
      SELECT 
        u.id, u.unit_number, u.unit_name,
        COALESCE(us.score, 0) AS total_score,
        us.notes
      FROM units u
      LEFT JOIN unit_scores us ON us.unit_id = u.id AND us.programme_id = ?
      ORDER BY total_score DESC, u.unit_number ASC
    `).all(programmeId);

    const ranked = units.map((u, idx) => ({ ...u, rank: idx + 1 }));
    res.json(ranked);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
