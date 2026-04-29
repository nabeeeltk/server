const express = require('express');
const { db } = require('../db');
const { verifyToken, isAdmin } = require('../middleware/auth');
const router = express.Router();

// POST /api/scores — admin only (upsert)
router.post('/', verifyToken, isAdmin, (req, res) => {
  const { unit_id, programme_id, score, notes } = req.body;
  if (!unit_id || !programme_id || score === undefined) {
    return res.status(400).json({ error: 'unit_id, programme_id, and score are required' });
  }
  try {
    db.prepare(`
      INSERT INTO unit_scores (unit_id, programme_id, score, notes, awarded_by)
      VALUES (?,?,?,?,?)
      ON CONFLICT(unit_id, programme_id) DO UPDATE SET score=excluded.score, notes=excluded.notes, awarded_by=excluded.awarded_by, awarded_at=CURRENT_TIMESTAMP
    `).run(unit_id, programme_id, score, notes || null, req.userId);
    const saved = db.prepare('SELECT * FROM unit_scores WHERE unit_id=? AND programme_id=?').get(unit_id, programme_id);
    res.status(201).json(saved);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/scores/:id — admin only
router.put('/:id', verifyToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const { score, notes } = req.body;
  try {
    const existing = db.prepare('SELECT * FROM unit_scores WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Score not found' });
    db.prepare('UPDATE unit_scores SET score=?, notes=?, awarded_at=CURRENT_TIMESTAMP WHERE id=?')
      .run(score ?? existing.score, notes ?? existing.notes, id);
    const updated = db.prepare('SELECT * FROM unit_scores WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/scores/unit/:unitId
router.get('/unit/:unitId', verifyToken, (req, res) => {
  const { unitId } = req.params;
  if (req.userRole === 'unit' && req.unitId !== parseInt(unitId)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    const rows = db.prepare(`
      SELECT us.*, p.title AS programme_title, p.description AS programme_description
      FROM unit_scores us
      JOIN programmes p ON us.programme_id = p.id
      WHERE us.unit_id = ?
      ORDER BY us.awarded_at DESC
    `).all(unitId);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
