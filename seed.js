// seed.js — SQLite version. Run with: node seed.js from /server directory
import Database from 'better-sqlite3';
import { hashSync } from 'bcryptjs';
import { join } from 'path';
import { existsSync, unlinkSync, readFileSync } from 'fs';
require('dotenv').config();

const dbPath = join(__dirname, 'panchayat.db');

// Delete existing DB to start fresh
if (existsSync(dbPath)) {
  unlinkSync(dbPath);
  console.log('🗑️  Removed old database');
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

async function seed() {
  console.log('🌱 Starting SQLite database seed...');

  // Apply schema
  const schema = readFileSync(join(__dirname, 'db', 'schema.sql'), 'utf8');
  db.exec(schema);
  console.log('✅ Schema applied');

  // Admin user
  const adminHash = hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
  db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?,?,?)').run('admin', adminHash, 'admin');
  console.log('✅ Admin user created');

  // 21 units
  const unitNames = [
    'Thiruvananthapuram North', 'Thiruvananthapuram South', 'Kollam Central',
    'Pathanamthitta East', 'Alappuzha West', 'Kottayam Heritage',
    'Idukki Hills', 'Ernakulam Metro', 'Thrissur Cultural',
    'Palakkad Gateway', 'Malappuram Pride', 'Kozhikode Harbour',
    'Wayanad Green', 'Kannur Legends', 'Kasaragod Frontier',
    'Varkala Coastal', 'Munnar Alpine', 'Kochi Port',
    'Guruvayur Sacred', 'Thrippunithura Royal', 'Aluva Industrial'
  ];

  const unitIds = [];
  const insertUnit = db.prepare('INSERT INTO units (unit_number, unit_name, description) VALUES (?,?,?)');
  for (let i = 1; i <= 21; i++) {
    const info = insertUnit.run(i, `Unit ${String(i).padStart(2,'0')} - ${unitNames[i-1]}`, `Panchayat Unit serving the ${unitNames[i-1]} ward area.`);
    unitIds.push(info.lastInsertRowid);
  }
  console.log('✅ 21 units created');

  // 21 unit users
  const insertUser = db.prepare('INSERT INTO users (username, password_hash, role, unit_id) VALUES (?,?,?,?)');
  for (let i = 1; i <= 21; i++) {
    const unitNum = String(i).padStart(2, '0');
    const hash = hashSync(`unit${unitNum}pass`, 10);
    insertUser.run(`unit_${unitNum}`, hash, 'unit', unitIds[i - 1]);
  }
  console.log('✅ 21 unit users created');

  // Sample members
  const designations = ['President', 'Vice President', 'Secretary', 'Treasurer', 'Ward Member', 'Member'];
  const firstNames = ['Rajan', 'Priya', 'Suresh', 'Anitha', 'Mohan', 'Lakshmi', 'Vijay', 'Meena', 'Arun', 'Divya', 'Saji', 'Reena'];
  const lastNames = ['Kumar', 'Nair', 'Pillai', 'Menon', 'Thomas', 'George', 'Varghese', 'Philip', 'Joseph', 'Abraham'];
  const genders = ['Male', 'Female'];

  const insertMember = db.prepare(
    'INSERT INTO unit_members (unit_id, member_name, phone, email, address, ward_number, designation, gender, date_of_birth, joined_date, is_active) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
  );
  for (let unitIdx = 0; unitIdx < unitIds.length; unitIdx++) {
    const count = 4 + Math.floor(Math.random() * 2);
    for (let m = 0; m < count; m++) {
      const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
      const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
      const desig = designations[m < 6 ? m : 5];
      insertMember.run(
        unitIds[unitIdx],
        `${fn} ${ln}`,
        `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`,
        `${fn.toLowerCase()}.${ln.toLowerCase()}@gmail.com`,
        `Ward ${m + 1}, ${unitNames[unitIdx]}, Kerala`,
        `${unitIdx + 1}${String(m + 1).padStart(2, '0')}`,
        desig,
        genders[Math.floor(Math.random() * 2)],
        `${1960 + Math.floor(Math.random() * 40)}-${String(1 + Math.floor(Math.random() * 12)).padStart(2,'0')}-${String(1 + Math.floor(Math.random() * 28)).padStart(2,'0')}`,
        `${2020 + Math.floor(Math.random() * 4)}-01-01`,
        1
      );
    }
  }
  console.log('✅ Sample members created');

  // Admin user id
  const adminUser = db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get();
  const adminId = adminUser.id;

  // 3 announcements
  const insertAnn = db.prepare('INSERT INTO announcements (title, content, is_pinned, created_by) VALUES (?,?,?,?)');
  insertAnn.run('📌 Important: Annual Panchayat Meeting', 'The annual general meeting of the Panchayat Committee will be held on 15th May 2026 at the Panchayat Bhavan. All unit representatives must attend.', 1, adminId);
  insertAnn.run('Cultural Programme Registration Open', 'Units can now register for the Annual Cultural Programme 2026. Submit your entries before 30th April 2026. Contact the secretary for more details.', 0, adminId);
  insertAnn.run('Blood Donation Camp', 'A blood donation camp will be organized at the Community Health Centre on 10th May 2026. All units are requested to encourage members to participate.', 0, adminId);
  console.log('✅ Announcements created');

  // 2 programmes
  const p1 = db.prepare('INSERT INTO programmes (title, description, created_by) VALUES (?,?,?)').run('Annual Cultural Fest 2026', 'A grand celebration of Kerala culture featuring classical dance, music, and drama performances from all 21 units.', adminId);
  const p2 = db.prepare('INSERT INTO programmes (title, description, created_by) VALUES (?,?,?)').run('Clean Kerala Initiative', 'A community cleanliness drive across all wards to promote sanitation and environmental awareness.', adminId);
  const progIds = [p1.lastInsertRowid, p2.lastInsertRowid];

  const insertAlloc = db.prepare('INSERT OR IGNORE INTO programme_allocations (programme_id, unit_id) VALUES (?,?)');
  for (const uid of unitIds) {
    insertAlloc.run(progIds[0], uid);
    insertAlloc.run(progIds[1], uid);
  }
  console.log('✅ Programmes and allocations created');

  // 10 blood members
  const bloodData = [
    [unitIds[0], 'Anoop Krishnan', 'O+', '+91 9876543210', 'Ward 1, Thiruvananthapuram'],
    [unitIds[1], 'Sreeja Menon', 'A+', '+91 9876543211', 'Ward 2, Thiruvananthapuram'],
    [unitIds[2], 'Bibin Thomas', 'B+', '+91 9876543212', 'Ward 3, Kollam'],
    [unitIds[3], 'Renjith Kumar', 'AB+', '+91 9876543213', 'Ward 4, Pathanamthitta'],
    [unitIds[4], 'Deepa Nair', 'O-', '+91 9876543214', 'Ward 5, Alappuzha'],
    [unitIds[5], 'Saju George', 'A-', '+91 9876543215', 'Ward 6, Kottayam'],
    [unitIds[6], 'Lekha Pillai', 'B-', '+91 9876543216', 'Ward 7, Idukki'],
    [unitIds[7], 'Vineeth Varghese', 'AB-', '+91 9876543217', 'Ward 8, Ernakulam'],
    [unitIds[8], 'Sruthy Joseph', 'A+', '+91 9876543218', 'Ward 9, Thrissur'],
    [unitIds[9], 'Manoj Nair', 'B+', '+91 9876543219', 'Ward 10, Palakkad'],
  ];
  const insertBlood = db.prepare('INSERT INTO blood_members (unit_id, member_name, blood_group, phone, address) VALUES (?,?,?,?,?)');
  for (const [uid, name, bg, phone, addr] of bloodData) insertBlood.run(uid, name, bg, phone, addr);
  console.log('✅ Blood members created');

  // Sample scores
  const scores = [95, 88, 92, 76, 85, 90, 82, 79, 88, 94, 71, 83, 87, 91, 78, 86, 80, 89, 93, 75, 84];
  const insertScore = db.prepare('INSERT OR IGNORE INTO unit_scores (unit_id, programme_id, score, notes, awarded_by) VALUES (?,?,?,?,?)');
  for (let i = 0; i < unitIds.length; i++) {
    insertScore.run(unitIds[i], progIds[0], scores[i], 'Score based on performance evaluation', adminId);
    insertScore.run(unitIds[i], progIds[1], Math.floor(60 + Math.random() * 40), 'Score based on cleanliness audit', adminId);
  }
  console.log('✅ Sample scores created');

  db.close();

  console.log('\n🎉 SQLite database seeded successfully!');
  console.log('📋 Login credentials:');
  console.log('   Admin: username=admin, password=admin123');
  console.log('   Units: unit_01/unit01pass ... unit_21/unit21pass');
}

seed().catch(err => { console.error('❌ Seed error:', err); process.exit(1); });
