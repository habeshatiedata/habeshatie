const db = require('../config/db');

// Render User Dashboard
exports.getDashboard = (req, res) => {
  const userId = req.session.userId;

  db.all(
    `SELECT b.*, 
            COALESCE(a.views_count, 0) as views_count, 
            COALESCE(a.whatsapp_clicks, 0) as whatsapp_clicks
     FROM businesses b
     LEFT JOIN analytics a ON b.id = a.business_id
     WHERE b.user_id = ?
     ORDER BY b.created_at DESC`,
    [userId],
    (err, businesses) => {
      res.render('dashboard', { businesses: businesses || [] });
    }
  );
};

// Render Create Business Page
exports.getCreateBusiness = (req, res) => {
  res.render('business-create', { error: null });
};

// Create Business Listing
exports.postCreateBusiness = (req, res) => {
  const userId = req.session.userId;
  const { name, category, city, country, phone, description, languages } = req.body;
  const photo = req.file ? `/uploads/${req.file.filename}` : '/uploads/default.jpg';

  const baseSlug = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
  const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

  db.run(
    `INSERT INTO businesses (user_id, name, slug, category, city, country, phone, description, photo, languages)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, name, slug, category, city, country, phone, description, photo, languages],
    function (err) {
      if (err) {
        return res.render('business-create', { error: 'Failed to create business listing.' });
      }
      
      const businessId = this.lastID;
      // Initialize Analytics Record
      db.run('INSERT INTO analytics (business_id, views_count, whatsapp_clicks) VALUES (?, 0, 0)', [businessId]);
      
      res.redirect('/dashboard');
    }
  );
};
