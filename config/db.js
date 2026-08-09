const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Store SQLite database in /home/habeshatie/db/habeshatie.db
const dbPath = path.join(__dirname, '../db/habeshatie.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database Connection Error:', err.message);
  } else {
    console.log('⚡ Connected to SQLite Database at:', dbPath);
  }
});

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');

  // Users Table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Businesses Table
  db.run(`
    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      city TEXT NOT NULL,
      country TEXT NOT NULL,
      phone TEXT NOT NULL,
      description TEXT NOT NULL,
      photo TEXT DEFAULT '/uploads/default.jpg',
      languages TEXT,
      is_featured BOOLEAN DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Analytics Table
  db.run(`
    CREATE TABLE IF NOT EXISTS analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER UNIQUE NOT NULL,
      views_count INTEGER DEFAULT 0,
      whatsapp_clicks INTEGER DEFAULT 0,
      phone_clicks INTEGER DEFAULT 0,
      FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE
    )
  `);

  // Reviews Table
  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      reviewer_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      owner_response TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE
    )
  `);

  // Indexes for high performance searches
  db.run(`CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_businesses_country ON businesses(country)`);
});

module.exports = db;
