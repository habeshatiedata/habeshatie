const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../db/habeshatie.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
    return;
  }
  console.log('Connected to SQLite Database at: ' + dbPath);

  // CRITICAL: Explicitly enable foreign key constraints in SQLite
  db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
    if (pragmaErr) {
      console.error('Failed to enable foreign keys:', pragmaErr.message);
    }
  });

  db.serialize(() => {
    // Users Table with strict structure
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      otp_code TEXT,
      otp_expiry DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Businesses Table with slug uniqueness and proper constraints
    db.run(`CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      category TEXT NOT NULL,
      city TEXT NOT NULL,
      country TEXT NOT NULL,
      phone TEXT NOT NULL,
      description TEXT,
      photo TEXT,
      languages TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // Analytics Table with default initialization support
    db.run(`CREATE TABLE IF NOT EXISTS analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      views_count INTEGER DEFAULT 0,
      whatsapp_clicks INTEGER DEFAULT 0,
      FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE
    )`);

    // Reviews Table
    db.run(`CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE
    )`);

    // Performance Indexes for Global Scaling
    db.run(`CREATE INDEX IF NOT EXISTS idx_businesses_user ON businesses(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_businesses_country_category ON businesses(country, category)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_analytics_business ON analytics(business_id);`);
  });
});

module.exports = db;
