const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/cities', (req, res) => {
  const query = (req.query.q || '').trim();

  let sql = `
    SELECT id, name, city, photo 
    FROM businesses 
    WHERE (city IS NOT NULL AND city != '') OR (name IS NOT NULL AND name != '')
  `;
  let params = [];

  if (query) {
    sql += ` AND (city LIKE ? OR name LIKE ?)`;
    params.push(`%${query}%`, `%${query}%`);
  }

  sql += ` ORDER BY name ASC LIMIT 10`;

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Error fetching autocomplete suggestions:', err);
      return res.status(500).json({ cities: [] });
    }
    
    const results = rows.map(r => ({
      id: r.id,
      name: r.name,
      city: r.city,
      photo: r.photo && r.photo.trim() !== '' ? r.photo : '/uploads/default.jpg'
    }));

    res.json({ cities: results });
  });
});

module.exports = router;
