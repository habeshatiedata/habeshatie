const db = require('../config/db');
const { parsePhoneNumberFromString } = require('libphonenumber-js');

const countryToAlpha2 = {
  "United States": "US",
  "Canada": "CA",
  "United Kingdom": "GB",
  "Germany": "DE",
  "Sweden": "SE",
  "Switzerland": "CH",
  "Netherlands": "NL",
  "Norway": "NO",
  "France": "FR",
  "Italy": "IT",
  "Saudi Arabia": "SA",
  "United Arab Emirates": "AE",
  "Israel": "IL",
  "Ethiopia": "ET",
  "Eritrea": "ER",
  "South Africa": "ZA",
  "Kenya": "KE",
  "Sudan": "SD",
  "Australia": "AU"
};

exports.getDirectory = (req, res) => {
  db.all('SELECT * FROM businesses ORDER BY created_at DESC', [], (err, businesses) => {
    if (err) {
      return res.render('index', { businesses: [] });
    }
    res.render('index', { businesses: businesses || [] });
  });
};

exports.getCategories = (req, res) => {
  db.all('SELECT DISTINCT category FROM businesses', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows.map(r => r.category));
  });
};

exports.getCities = (req, res) => {
  db.all('SELECT DISTINCT city FROM businesses', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows.map(r => r.city));
  });
};

exports.apiSearch = (req, res) => {
  const { q, category, city } = req.query;
  let query = 'SELECT * FROM businesses WHERE 1=1';
  let params = [];
  if (category && category !== 'All') { query += ' AND category = ?'; params.push(category); }
  if (city && city !== 'All') { query += ' AND city = ?'; params.push(city); }
  if (q) { query += ' AND (name LIKE ? OR description LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
};

exports.getDashboard = (req, res) => {
  const userId = req.session.userId;
  db.all(`SELECT b.*, COALESCE(a.views_count, 0) as views_count, COALESCE(a.whatsapp_clicks, 0) as whatsapp_clicks FROM businesses b LEFT JOIN analytics a ON b.id = a.business_id WHERE b.user_id = ? ORDER BY b.created_at DESC`, [userId], (err, businesses) => {
    if (err) {
      return res.render('dashboard', { businesses: [] });
    }
    res.render('dashboard', { businesses: businesses || [] });
  });
};

exports.getCreateBusiness = (req, res) => {
  res.render('business-create', { error: null, formData: {} });
};

exports.postCreateBusiness = (req, res) => {
  const userId = req.session.userId;
  const { name, category, city, country, phone, description, languages } = req.body;
  const photo = req.file ? `/uploads/${req.file.filename}` : '/uploads/default.jpg';

  const countryCode = countryToAlpha2[country];
  if (!countryCode) {
    return res.render('business-create', { 
      error: 'Please select a valid supported country.',
      formData: { name, category, city, country, phone, description, languages }
    });
  }

  const phoneNumber = parsePhoneNumberFromString(phone, countryCode);
  if (!phoneNumber || !phoneNumber.isValid()) {
    return res.render('business-create', { 
      error: `Invalid phone number for ${country}. Please enter a valid number format.`,
      formData: { name, category, city, country, phone, description, languages }
    });
  }

  const formattedPhone = phoneNumber.format('E.164');
  const baseSlug = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
  const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

  db.run(`INSERT INTO businesses (user_id, name, slug, category, city, country, phone, description, photo, languages) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
    [userId, name, slug, category, city, country, formattedPhone, description, photo, languages], function (err) {
    if (err) {
      return res.render('business-create', { 
        error: 'Failed to create business listing due to database error.',
        formData: { name, category, city, country, phone, description, languages }
      });
    }
    db.run('INSERT INTO analytics (business_id, views_count, whatsapp_clicks) VALUES (?, 0, 0)', [this.lastID], () => {
      res.redirect('/dashboard');
    });
  });
};
