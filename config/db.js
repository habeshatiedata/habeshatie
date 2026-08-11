const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../db/habeshatie.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error(err.message);
  console.log('Connected to SQLite Database at: ' + dbPath);

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT,
      is_admin INTEGER DEFAULT 0,
      otp_code TEXT,
      otp_expiry DATETIME
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT,
      slug TEXT,
      category TEXT,
      city TEXT,
      country TEXT,
      phone TEXT,
      description TEXT,
      photo TEXT,
      languages TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      views_count INTEGER DEFAULT 0,
      whatsapp_clicks INTEGER DEFAULT 0,
      FOREIGN KEY(business_id) REFERENCES businesses(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      rating INTEGER,
      comment TEXT,
      FOREIGN KEY(business_id) REFERENCES businesses(id)
    )`);
  });
});

module.exports = db;
