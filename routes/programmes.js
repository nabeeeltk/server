const express = require('express');
const { db } = require('../db');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { uploadProgrammePhoto } = require('../middleware/upload');
const router = express.Router();

const logActivity = (unitId, action, targetId, performedBy) => {
  try {
    db.prepare('INSERT INTO activity_log (unit_id, action, target_type, target_id, performed_by) VALUES (?,?,?,?,?)')
      .run(unitId, action, 'programme', targetId, performedBy);
  } catch (e) { console.error('Activity log error:', e.message); }
};

// GET /api/programmes
router.get('/', verifyToken, (req, res) => {
  try {
    const programmes = db.prepare('SELECT * FROM programmes ORDER BY created_at DESC').all();
    const result = programmes.map(p => {
      const allocs = db.prepare(
        'SELECT pa.unit_id, un.unit_name, un.unit_number FROM programme_allocations pa JOIN units un ON un.id = pa.unit_id WHERE pa.programme_id = ?'
      ).all(p.id);
      return { ...p, allocated_units: allocs };
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/programmes/unit/:unitId
router.get('/unit/:unitId', verifyToken, (req, res) => {
  const { unitId } = req.params;
  if (req.userRole === 'unit' && req.unitId !== parseInt(unitId)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    const rows = db.prepare(`
      SELECT p.* FROM programmes p
      INNER JOIN programme_allocations pa ON pa.programme_id = p.id AND pa.unit_id = ?
      ORDER BY p.created_at DESC
    `).all(unitId);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/programmes — admin only
router.post('/', verifyToken, isAdmin, uploadProgrammePhoto.single('picture'), (req, res) => {
  const { title, description, allocated_unit_ids } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const pictureUrl = req.file ? `/uploads/programmes/${req.file.filename}` : null;
  try {
    const info = db.prepare(
      'INSERT INTO programmes (title, description, picture_url, created_by) VALUES (?,?,?,?)'
    ).run(title, description || null, pictureUrl, req.userId);
    const programme = db.prepare('SELECT * FROM programmes WHERE id = ?').get(info.lastInsertRowid);

    let unitIds = [];
    if (allocated_unit_ids) {
      try { unitIds = JSON.parse(allocated_unit_ids); } catch { unitIds = []; }
    }
    const insertAlloc = db.prepare('INSERT OR IGNORE INTO programme_allocations (programme_id, unit_id) VALUES (?,?)');
    for (const uid of unitIds) {
      insertAlloc.run(programme.id, uid);
      logActivity(uid, 'PROGRAMME_ALLOCATED', programme.id, req.userId);
    }
    res.status(201).json(programme);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/programmes/:id — admin only
router.put('/:id', verifyToken, isAdmin, uploadProgrammePhoto.single('picture'), (req, res) => {
  const { id } = req.params;
  const { title, description, allocated_unit_ids } = req.body;
  try {
    const existing = db.prepare('SELECT * FROM programmes WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Programme not found' });
    const pictureUrl = req.file ? `/uploads/programmes/${req.file.filename}` : existing.picture_url;
    db.prepare('UPDATE programmes SET title=?, description=?, picture_url=? WHERE id=?')
      .run(title || existing.title, description ?? existing.description, pictureUrl, id);

    if (allocated_unit_ids !== undefined) {
      db.prepare('DELETE FROM programme_allocations WHERE programme_id = ?').run(id);
      let unitIds = [];
      try { unitIds = JSON.parse(allocated_unit_ids); } catch {}
      const insertAlloc = db.prepare('INSERT OR IGNORE INTO programme_allocations (programme_id, unit_id) VALUES (?,?)');
      for (const uid of unitIds) insertAlloc.run(id, uid);
    }
    const updated = db.prepare('SELECT * FROM programmes WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/programmes/:id — admin only
router.delete('/:id', verifyToken, isAdmin, (req, res) => {
  const { id } = req.params;
  try {
    const existing = db.prepare('SELECT id FROM programmes WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Programme not found' });
    db.prepare('DELETE FROM programmes WHERE id = ?').run(id);
    res.json({ message: 'Programme deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
