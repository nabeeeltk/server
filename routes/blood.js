const express = require('express');
const { db } = require('../db');
const { verifyToken, isAdmin, isUnit } = require('../middleware/auth');
const router = express.Router();

// GET /api/blood/all — admin only
router.get('/all', verifyToken, isAdmin, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT bm.*, un.unit_name, un.unit_number 
      FROM blood_members bm 
      JOIN units un ON bm.unit_id = un.id 
      ORDER BY un.unit_number, bm.member_name
    `).all();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/blood/unit/:unitId
router.get('/unit/:unitId', verifyToken, (req, res) => {
  const { unitId } = req.params;
  if (req.userRole === 'unit' && req.unitId !== parseInt(unitId)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const { blood_group } = req.query;
  try {
    let sql = 'SELECT * FROM blood_members WHERE unit_id = ?';
    const params = [unitId];
    if (blood_group) { sql += ' AND blood_group = ?'; params.push(blood_group); }
    sql += ' ORDER BY member_name';
    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/blood — unit only
router.post('/', verifyToken, isUnit, (req, res) => {
  const { member_name, blood_group, phone, address } = req.body;
  if (!member_name || !blood_group) return res.status(400).json({ error: 'Member name and blood group are required' });
  const validGroups = ['A+','A-','B+','B-','O+','O-','AB+','AB-'];
  if (!validGroups.includes(blood_group)) return res.status(400).json({ error: 'Invalid blood group' });
  try {
    const info = db.prepare('INSERT INTO blood_members (unit_id, member_name, blood_group, phone, address) VALUES (?,?,?,?,?)')
      .run(req.unitId, member_name, blood_group, phone || null, address || null);
    const newMember = db.prepare('SELECT * FROM blood_members WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(newMember);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/blood/:id — unit, own only
router.put('/:id', verifyToken, isUnit, (req, res) => {
  const { id } = req.params;
  try {
    const existing = db.prepare('SELECT * FROM blood_members WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Blood member not found' });
    if (existing.unit_id !== req.unitId) return res.status(403).json({ error: 'Access denied' });
    const { member_name, blood_group, phone, address } = req.body;
    db.prepare('UPDATE blood_members SET member_name=?, blood_group=?, phone=?, address=? WHERE id=?')
      .run(member_name || existing.member_name, blood_group || existing.blood_group, phone || existing.phone, address || existing.address, id);
    const updated = db.prepare('SELECT * FROM blood_members WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/blood/:id — unit, own only
router.delete('/:id', verifyToken, isUnit, (req, res) => {
  const { id } = req.params;
  try {
    const existing = db.prepare('SELECT * FROM blood_members WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Blood member not found' });
    if (existing.unit_id !== req.unitId) return res.status(403).json({ error: 'Access denied' });
    db.prepare('DELETE FROM blood_members WHERE id = ?').run(id);
    res.json({ message: 'Blood member deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
