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

// Since app.js uses app.use('/', dashboardRoutes), we explicitly include /dashboard in the paths here:
router.get('/dashboard', requireAuth, dashboardController.getDashboard);
router.get('/dashboard/create', requireAuth, dashboardController.getCreateBusiness);
router.post('/dashboard/create', requireAuth, upload.single('photo'), dashboardController.postCreateBusiness);
router.get('/dashboard/edit/:id', requireAuth, dashboardController.getEditBusiness);
router.post('/dashboard/edit/:id', requireAuth, upload.single('photo'), dashboardController.postEditBusiness);
router.post('/dashboard/delete/:id', requireAuth, dashboardController.deleteBusiness);

module.exports = router;
