const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const dashboardController = require('../controllers/dashboardController');

// Middleware to protect routes (auth check)
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.get('/dashboard', requireAuth, dashboardController.getDashboard);
router.get('/dashboard/create', requireAuth, dashboardController.getCreateBusiness);
router.post('/dashboard/create', requireAuth, upload.single('photo'), dashboardController.postCreateBusiness);

module.exports = router;
