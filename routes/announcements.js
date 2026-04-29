const express = require('express');
const { db } = require('../db');
const { verifyToken, isAdmin } = require('../middleware/auth');
const router = express.Router();

// GET /api/announcements
router.get('/', verifyToken, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM announcements ORDER BY is_pinned DESC, created_at DESC').all();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/announcements — admin only
router.post('/', verifyToken, isAdmin, (req, res) => {
  const { title, content, is_pinned } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
  try {
    const info = db.prepare(
      'INSERT INTO announcements (title, content, is_pinned, created_by) VALUES (?,?,?,?)'
    ).run(title, content, is_pinned ? 1 : 0, req.userId);
    const ann = db.prepare('SELECT * FROM announcements WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(ann);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/announcements/:id — admin only
router.put('/:id', verifyToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const { title, content, is_pinned } = req.body;
  try {
    const existing = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Announcement not found' });
    db.prepare('UPDATE announcements SET title=?, content=?, is_pinned=? WHERE id=?')
      .run(title ?? existing.title, content ?? existing.content, is_pinned !== undefined ? (is_pinned ? 1 : 0) : existing.is_pinned, id);
    const updated = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/announcements/:id — admin only
router.delete('/:id', verifyToken, isAdmin, (req, res) => {
  const { id } = req.params;
  try {
    const existing = db.prepare('SELECT id FROM announcements WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Announcement not found' });
    db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
