// db/index.js — SQLite adapter that mimics pg's query interface
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'panchayat.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Wraps better-sqlite3 to mimic pg's async query interface:
 *   const result = await db.query('SELECT ...', [params])
 *   result.rows → array of row objects
 */
function query(sql, params = []) {
  // Convert PostgreSQL $1, $2, ... placeholders to ? for SQLite
  let converted = sql.replace(/\$(\d+)/g, '?');

  // Reorder params if needed (SQLite uses positional ?)
  // For ON CONFLICT ... DO UPDATE, SQLite syntax differs — handled in individual routes

  try {
    // Detect statement type
    const trimmed = converted.trim().toUpperCase();

    if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
      const stmt = db.prepare(converted);
      const rows = stmt.all(...params);
      return Promise.resolve({ rows, rowCount: rows.length });
    } else if (trimmed.startsWith('INSERT')) {
      const stmt = db.prepare(converted);
      const info = stmt.run(...params);
      // Return inserted row id as rows[0].id for RETURNING * emulation
      return Promise.resolve({ rows: [{ id: info.lastInsertRowid }], rowCount: info.changes });
    } else if (trimmed.startsWith('UPDATE') || trimmed.startsWith('DELETE')) {
      const stmt = db.prepare(converted);
      const info = stmt.run(...params);
      return Promise.resolve({ rows: [], rowCount: info.changes });
    } else {
      // DDL (CREATE TABLE, etc.)
      db.exec(converted);
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
  } catch (err) {
    return Promise.reject(err);
  }
}

// Run raw SQL (used for schema + seed multi-statement blocks)
function exec(sql) {
  db.exec(sql);
}

// Get a row by id after insert (for RETURNING * emulation)
function getById(table, id) {
  const stmt = db.prepare(`SELECT * FROM ${table} WHERE id = ?`);
  return stmt.get(id);
}

// Expose raw db for complex queries
module.exports = { query, exec, getById, db };
