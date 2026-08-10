const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');

// Page routes
router.get('/', businessController.getDirectory);
router.get('/b/:slug', businessController.getBusinessBySlug);
router.post('/b/:slug/review', businessController.addReview);

// API routes
router.post('/api/track-whatsapp/:id', businessController.trackWhatsAppClick);
router.get('/api/categories', businessController.getCategories);
router.get('/api/search', businessController.apiSearch);

module.exports = router;
