-- SQLite Schema for Panchayat Committee Portal

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'unit')),
  unit_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_number INTEGER UNIQUE NOT NULL,
  unit_name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS unit_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  member_photo TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  ward_number TEXT,
  designation TEXT,
  gender TEXT,
  date_of_birth TEXT,
  joined_date TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS programmes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  picture_url TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS programme_allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  programme_id INTEGER REFERENCES programmes(id) ON DELETE CASCADE,
  unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
  allocated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(programme_id, unit_id)
);

CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gallery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_url TEXT NOT NULL,
  caption TEXT,
  programme_id INTEGER REFERENCES programmes(id) ON DELETE SET NULL,
  uploaded_by INTEGER REFERENCES users(id),
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blood_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  blood_group TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS unit_uploads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT,
  title TEXT NOT NULL,
  description TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS unit_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
  programme_id INTEGER REFERENCES programmes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  awarded_by INTEGER REFERENCES users(id),
  awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(unit_id, programme_id)
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id INTEGER,
  performed_by INTEGER REFERENCES users(id),
  performed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
