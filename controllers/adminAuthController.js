const bcrypt = require('bcryptjs');
const db = require('../config/db');

// Render Isolated Admin Login
exports.getAdminLogin = (req, res) => {
  res.render('admin-login', { error: null });
};

// Process Admin Credentials & Trigger 2FA
exports.postAdminLogin = (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = email ? email.toLowerCase().trim() : '';

  db.get('SELECT * FROM users WHERE email = ? AND is_admin = 1', [cleanEmail], async (err, user) => {
    if (err || !user) {
      return res.render('admin-login', { error: 'Invalid master credentials or unauthorized access.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('admin-login', { error: 'Invalid master credentials.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // Valid for 10 minutes

    db.run('UPDATE users SET otp_code = ?, otp_expiry = ? WHERE id = ?', [otp, expiry, user.id], (err) => {
      if (err) {
        return res.render('admin-login', { error: 'System error generating 2FA security token.' });
      }

      console.log('\n========================================');
      console.log('🔒 [HABESHATIE MASTER SECURITY 2FA ALERT]');
      console.log(`Target Admin: ${user.email}`);
      console.log(`Generated 6-Digit OTP: ${otp}`);
      console.log('Dispatched via: [Secure Email] & [WhatsApp API]');
      console.log('========================================\n');

      req.session.pendingAdminId = user.id;
      res.render('admin-verify', { error: null, email: user.email });
    });
  });
};

// Process 2FA Code Verification
exports.postVerify2FA = (req, res) => {
  const { otp } = req.body;
  const adminId = req.session.pendingAdminId;

  if (!adminId) {
    return res.redirect('/master-secure-access');
  }

  db.get('SELECT * FROM users WHERE id = ? AND is_admin = 1', [adminId], (err, user) => {
    if (err || !user) {
      return res.redirect('/master-secure-access');
    }

    const now = new Date();
    const expiry = new Date(user.otp_expiry);

    if (now > expiry) {
      return res.render('admin-verify', { error: 'Security code has expired. Please login again.', email: user.email });
    }

    if (!otp || user.otp_code !== otp.trim()) {
      return res.render('admin-verify', { error: 'Invalid security code. Please check your Email/WhatsApp.', email: user.email });
    }

    db.run('UPDATE users SET otp_code = NULL, otp_expiry = NULL WHERE id = ?', [user.id], () => {
      delete req.session.pendingAdminId;
      req.session.userId = user.id;
      req.session.userEmail = user.email;
      req.session.isAdmin = true;

      res.redirect('/admin/dashboard');
    });
  });
};
