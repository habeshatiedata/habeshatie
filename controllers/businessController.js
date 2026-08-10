const db = require('../config/db');

// Helper to generate clean slugs
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

// Public Homepage & Directory Search
exports.getDirectory = (req, res) => {
  const { search, category, country } = req.query;
  let query = 'SELECT * FROM businesses WHERE 1=1';
  let params = [];

  if (search) {
    query += ' AND (name LIKE ? OR description LIKE ? OR city LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (country) {
    query += ' AND country = ?';
    params.push(country);
  }

  query += ' ORDER BY is_featured DESC, created_at DESC';

  db.all(query, params, (err, businesses) => {
    if (err) businesses = [];
    res.render('index', { businesses, search, category, country });
  });
};

// View Single Business Page
exports.getBusinessBySlug = (req, res) => {
  const { slug } = req.params;

  db.get('SELECT * FROM businesses WHERE slug = ?', [slug], (err, business) => {
    if (err || !business) {
      return res.status(404).render('404', { message: 'Business not found' });
    }

    db.run('UPDATE analytics SET views_count = views_count + 1 WHERE business_id = ?', [business.id]);

    db.all(
      'SELECT * FROM reviews WHERE business_id = ? ORDER BY created_at DESC',
      [business.id],
      (err, reviews) => {
        res.render('business-detail', { business, reviews: reviews || [] });
      }
    );
  });
};

// Track WhatsApp Click
exports.trackWhatsAppClick = (req, res) => {
  const { id } = req.params;
  db.run('UPDATE analytics SET whatsapp_clicks = whatsapp_clicks + 1 WHERE business_id = ?', [id], () => {
    res.json({ success: true });
  });
};

// Add Review
exports.addReview = (req, res) => {
  const { slug } = req.params;
  const { reviewer_name, rating, comment } = req.body;

  db.get('SELECT id FROM businesses WHERE slug = ?', [slug], (err, business) => {
    if (err || !business) return res.redirect('/');

    db.run(
      'INSERT INTO reviews (business_id, reviewer_name, rating, comment) VALUES (?, ?, ?, ?)',
      [business.id, reviewer_name, parseInt(rating), comment],
      () => {
        res.redirect(`/b/${slug}`);
      }
    );
  });
};

// Dynamic Categories Endpoint Handler
exports.getCategories = (req, res) => {
  try {
    const { where } = req.query;
    let query = `SELECT DISTINCT category FROM businesses WHERE category IS NOT NULL AND category != ''`;
    let params = [];

    if (where && where.trim() !== '') {
      query += ` AND LOWER(city) = LOWER(?)`;
      params.push(where.trim());
    }

    query += ` ORDER BY category ASC`;

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error fetching categories from SQLite:', err);
        return res.status(500).json({ categories: [] });
      }

      const categories = rows ? rows.map(row => row.category) : [];
      res.json({ categories });
    });
  } catch (error) {
    console.error('Server error fetching categories:', error);
    res.status(500).json({ categories: [] });
  }
};

// Real-time API Search
exports.apiSearch = (req, res) => {
  const q = (req.query.q || req.query.search || '').trim();
  const where = (req.query.where || req.query.location || '').trim();

  let query = 'SELECT * FROM businesses WHERE 1=1';
  let params = [];

  // Filter by category or keyword search term
  if (q && q !== 'All Businesses & Services') {
    query += ' AND (name LIKE ? OR category LIKE ? OR description LIKE ?)';
    const term = `%${q}%`;
    params.push(term, term, term);
  }

  // Location search: query valid columns (city, country, description, name)
  if (where) {
    const words = where.split(/\s+/).filter(w => w.length > 2);
    if (words.length > 0) {
      const locationConditions = words.map(() => '(city LIKE ? OR country LIKE ? OR name LIKE ? OR description LIKE ?)').join(' OR ');
      query += ` AND (${locationConditions})`;
      words.forEach(word => {
        const term = `%${word}%`;
        params.push(term, term, term, term);
      });
    }
  }

  query += ' ORDER BY is_featured DESC, created_at DESC LIMIT 50';

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Search API Error:', err);
      return res.status(500).json({ results: [] });
    }
    res.json({ results: rows || [] });
  });
};
