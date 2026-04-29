const express = require('express');
const { db } = require('../db');
const { verifyToken, isAdmin, isUnit } = require('../middleware/auth');
const { uploadMemberPhoto } = require('../middleware/upload');
const router = express.Router();

const logActivity = (unitId, action, targetType, targetId, performedBy) => {
  try {
    db.prepare('INSERT INTO activity_log (unit_id, action, target_type, target_id, performed_by) VALUES (?,?,?,?,?)')
      .run(unitId, action, targetType, targetId, performedBy);
  } catch (e) { console.error('Activity log error:', e.message); }
};

// GET /api/members/all — admin only
router.get('/all', verifyToken, isAdmin, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT um.*, un.unit_name, un.unit_number 
      FROM unit_members um 
      JOIN units un ON um.unit_id = un.id 
      ORDER BY un.unit_number, um.member_name
    `).all();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/members/unit/:unitId
router.get('/unit/:unitId', verifyToken, (req, res) => {
  const { unitId } = req.params;
  if (req.userRole === 'unit' && req.unitId !== parseInt(unitId)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    const rows = db.prepare('SELECT * FROM unit_members WHERE unit_id = ? ORDER BY member_name').all(unitId);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/members — unit only
router.post('/', verifyToken, isUnit, uploadMemberPhoto.single('photo'), (req, res) => {
  const { member_name, phone, email, address, ward_number, designation, gender, date_of_birth, joined_date, is_active } = req.body;
  if (!member_name) return res.status(400).json({ error: 'Member name is required' });
  const photoUrl = req.file ? `/uploads/members/${req.file.filename}` : null;
  const activeVal = (is_active === 'false' || is_active === false) ? 0 : 1;
  try {
    const info = db.prepare(
      `INSERT INTO unit_members (unit_id, member_name, member_photo, phone, email, address, ward_number, designation, gender, date_of_birth, joined_date, is_active)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(req.unitId, member_name, photoUrl, phone || null, email || null, address || null, ward_number || null, designation || null, gender || null, date_of_birth || null, joined_date || null, activeVal);
    const newMember = db.prepare('SELECT * FROM unit_members WHERE id = ?').get(info.lastInsertRowid);
    logActivity(req.unitId, 'ADD_MEMBER', 'unit_member', info.lastInsertRowid, req.userId);
    res.status(201).json(newMember);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/members/:id — unit, own only
router.put('/:id', verifyToken, isUnit, uploadMemberPhoto.single('photo'), (req, res) => {
  const { id } = req.params;
  try {
    const existing = db.prepare('SELECT * FROM unit_members WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Member not found' });
    if (existing.unit_id !== req.unitId) return res.status(403).json({ error: 'Access denied' });

    const { member_name, phone, email, address, ward_number, designation, gender, date_of_birth, joined_date, is_active } = req.body;
    const photoUrl = req.file ? `/uploads/members/${req.file.filename}` : existing.member_photo;
    const activeVal = is_active !== undefined ? (is_active === 'false' || is_active === false ? 0 : 1) : existing.is_active;

    db.prepare(
      `UPDATE unit_members SET member_name=?, member_photo=?, phone=?, email=?, address=?, ward_number=?, designation=?, gender=?, date_of_birth=?, joined_date=?, is_active=? WHERE id=?`
    ).run(
      member_name || existing.member_name, photoUrl, phone || existing.phone,
      email || existing.email, address || existing.address, ward_number || existing.ward_number,
      designation || existing.designation, gender || existing.gender,
      date_of_birth || existing.date_of_birth, joined_date || existing.joined_date,
      activeVal, id
    );
    const updated = db.prepare('SELECT * FROM unit_members WHERE id = ?').get(id);
    logActivity(req.unitId, 'EDIT_MEMBER', 'unit_member', parseInt(id), req.userId);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/members/:id — soft delete
router.delete('/:id', verifyToken, isUnit, (req, res) => {
  const { id } = req.params;
  try {
    const existing = db.prepare('SELECT * FROM unit_members WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Member not found' });
    if (existing.unit_id !== req.unitId) return res.status(403).json({ error: 'Access denied' });
    db.prepare('UPDATE unit_members SET is_active = 0 WHERE id = ?').run(id);
    logActivity(req.unitId, 'DELETE_MEMBER', 'unit_member', parseInt(id), req.userId);
    res.json({ message: 'Member deactivated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/members/:id/photo
router.post('/:id/photo', verifyToken, isUnit, uploadMemberPhoto.single('photo'), (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });
  try {
    const existing = db.prepare('SELECT * FROM unit_members WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Member not found' });
    if (existing.unit_id !== req.unitId) return res.status(403).json({ error: 'Access denied' });
    const photoUrl = `/uploads/members/${req.file.filename}`;
    db.prepare('UPDATE unit_members SET member_photo=? WHERE id=?').run(photoUrl, id);
    const updated = db.prepare('SELECT * FROM unit_members WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
