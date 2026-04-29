const express = require('express');
const { db } = require('../db');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// GET /api/units
router.get('/', verifyToken, (req, res) => {
  try {
    const units = db.prepare(`
      SELECT 
        u.id, u.unit_number, u.unit_name, u.description,
        COUNT(DISTINCT CASE WHEN um.is_active = 1 THEN um.id END) AS member_count,
        COALESCE(SUM(us.score), 0) AS total_score
      FROM units u
      LEFT JOIN unit_members um ON um.unit_id = u.id
      LEFT JOIN unit_scores us ON us.unit_id = u.id
      GROUP BY u.id
      ORDER BY u.unit_number ASC
    `).all();
    res.json(units);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/units/:id
router.get('/:id', verifyToken, (req, res) => {
  try {
    const unit = db.prepare(`
      SELECT 
        u.id, u.unit_number, u.unit_name, u.description,
        COUNT(DISTINCT CASE WHEN um.is_active = 1 THEN um.id END) AS member_count,
        COALESCE(SUM(us.score), 0) AS total_score
      FROM units u
      LEFT JOIN unit_members um ON um.unit_id = u.id
      LEFT JOIN unit_scores us ON us.unit_id = u.id
      WHERE u.id = ?
      GROUP BY u.id
    `).get(req.params.id);
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    res.json(unit);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
