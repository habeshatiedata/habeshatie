const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');

router.get('/', businessController.getDirectory);
router.get('/b/:slug', businessController.getBusinessBySlug);
router.post('/b/:slug/review', businessController.addReview);
router.post('/api/track-whatsapp/:id', businessController.trackWhatsAppClick);


// Dynamic category search API
router.get('/api/categories', businessController.getCategories);

module.exports = router;


// API Search Endpoint (Real-time What, Where, How Far)
router.get('/api/search', (req, res) => {
  const q = req.query.q ? req.query.q.trim() : '';
  const where = req.query.where ? req.query.where.trim() : '';

  const searchTerm = `%${q}%`;
  const locationTerm = `%${where}%`;

  const sql = `
    SELECT id, name, category, city, address
    FROM businesses
    WHERE (name LIKE ? OR category LIKE ? OR description LIKE ?)
      AND (city LIKE ? OR address LIKE ?)
    LIMIT 10
  `;

  db.all(sql, [searchTerm, searchTerm, searchTerm, locationTerm, locationTerm], (err, rows) => {
    if (err) {
      console.error('Search API Error:', err);
      return res.status(500).json({ error: 'Search failed' });
    }
    res.json({ results: rows || [] });
  });
});
