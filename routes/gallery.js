const express = require('express');
const { db } = require('../db');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { uploadGalleryPhoto } = require('../middleware/upload');
const router = express.Router();

// GET /api/gallery
router.get('/', verifyToken, (req, res) => {
  const { programme_id } = req.query;
  try {
    let sql = 'SELECT g.*, p.title AS programme_title FROM gallery g LEFT JOIN programmes p ON g.programme_id = p.id';
    const params = [];
    if (programme_id) { sql += ' WHERE g.programme_id = ?'; params.push(programme_id); }
    sql += ' ORDER BY g.uploaded_at DESC';
    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/gallery — admin, multiple files
router.post('/', verifyToken, isAdmin, uploadGalleryPhoto.array('images', 20), (req, res) => {
  const { caption, programme_id } = req.body;
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No images uploaded' });
  try {
    const inserted = [];
    const stmt = db.prepare('INSERT INTO gallery (image_url, caption, programme_id, uploaded_by) VALUES (?,?,?,?)');
    for (const file of req.files) {
      const imageUrl = `/uploads/gallery/${file.filename}`;
      const info = stmt.run(imageUrl, caption || null, programme_id || null, req.userId);
      inserted.push(db.prepare('SELECT * FROM gallery WHERE id = ?').get(info.lastInsertRowid));
    }
    res.status(201).json(inserted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/gallery/:id — admin only
router.delete('/:id', verifyToken, isAdmin, (req, res) => {
  const { id } = req.params;
  try {
    const existing = db.prepare('SELECT id FROM gallery WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Photo not found' });
    db.prepare('DELETE FROM gallery WHERE id = ?').run(id);
    res.json({ message: 'Photo deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
