const express = require('express');
const { db } = require('../db');
const { verifyToken, isAdmin, isUnit } = require('../middleware/auth');
const { uploadUnitFile } = require('../middleware/upload');
const router = express.Router();

// GET /api/uploads/all — admin only
router.get('/all', verifyToken, isAdmin, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT uu.*, un.unit_name, un.unit_number 
      FROM unit_uploads uu 
      JOIN units un ON uu.unit_id = un.id 
      ORDER BY uu.uploaded_at DESC
    `).all();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/uploads/unit/:unitId
router.get('/unit/:unitId', verifyToken, (req, res) => {
  const { unitId } = req.params;
  if (req.userRole === 'unit' && req.unitId !== parseInt(unitId)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    const rows = db.prepare('SELECT * FROM unit_uploads WHERE unit_id = ? ORDER BY uploaded_at DESC').all(unitId);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/uploads — unit only
router.post('/', verifyToken, isUnit, uploadUnitFile.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const fileUrl = `/uploads/unit-uploads/${req.file.filename}`;
  const fileType = req.file.mimetype;
  try {
    const info = db.prepare('INSERT INTO unit_uploads (unit_id, file_url, file_type, title, description) VALUES (?,?,?,?,?)')
      .run(req.unitId, fileUrl, fileType, title, description || null);
    const upload = db.prepare('SELECT * FROM unit_uploads WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(upload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/uploads/:id — unit, own only
router.delete('/:id', verifyToken, isUnit, (req, res) => {
  const { id } = req.params;
  try {
    const existing = db.prepare('SELECT * FROM unit_uploads WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Upload not found' });
    if (existing.unit_id !== req.unitId) return res.status(403).json({ error: 'Access denied' });
    db.prepare('DELETE FROM unit_uploads WHERE id = ?').run(id);
    res.json({ message: 'Upload deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
