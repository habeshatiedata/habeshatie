const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');

router.get('/', businessController.getDirectory);
router.get('/b/:slug', businessController.getBusinessBySlug);
router.post('/b/:slug/review', businessController.addReview);
router.post('/api/track-whatsapp/:id', businessController.trackWhatsAppClick);

module.exports = router;
