const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');

if (typeof businessController.getDirectory === 'function') {
  router.get('/', businessController.getDirectory);
}

if (typeof businessController.getCategories === 'function') {
  router.get('/api/categories', businessController.getCategories);
}

if (typeof businessController.getCities === 'function') {
  router.get('/api/cities', businessController.getCities);
}

if (typeof businessController.apiSearch === 'function') {
  router.get('/api/search', businessController.apiSearch);
}

module.exports = router;
