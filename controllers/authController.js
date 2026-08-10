const bcrypt = require('bcryptjs');
const db = require('../config/db');

// Render Registration Page
exports.getRegister = (req, res) => {
  res.render('register', { error: null });
};

// Process Registration
exports.postRegister = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    // 1. Check if passwords match
    if (password !== confirmPassword) {
      return res.render('register', { error: 'Passwords do not match.' });
    }

    // 2. Minimum length check (8 characters)
    if (password.length < 8) {
      return res.render('register', { error: 'Password must be at least 8 characters long.' });
    }

    // 3. Capital letter check
    if (!/[A-Z]/.test(password)) {
      return res.render('register', { error: 'Password must contain at least one capital letter.' });
    }

    // 4. Number check
    if (!/\d/.test(password)) {
      return res.render('register', { error: 'Password must contain at least one number.' });
    }

    // Check if user already exists
    db.get('SELECT * FROM users WHERE email = ?', [cleanEmail], async (err, existingUser) => {
      if (err) {
        console.error('Database Error:', err);
        return res.render('register', { error: 'Database error occurred.' });
      }

      if (existingUser) {
        return res.render('register', { 
          error: 'An account with that email already exists. Please login instead.' 
        });
      }

      // Hash password and insert user
      const hashedPassword = await bcrypt.hash(password, 10);
      db.run('INSERT INTO users (email, password) VALUES (?, ?)', [cleanEmail, hashedPassword], function(err) {
        if (err) {
          console.error('User Insert Error:', err);
          return res.render('register', { error: 'Could not create account.' });
        }

        req.session.userId = this.lastID;
        req.session.userEmail = cleanEmail;
        res.redirect('/dashboard');
      });
    });

  } catch (err) {
    console.error('Registration Error:', err);
    res.render('register', { error: 'An error occurred during registration.' });
  }
};

// Render Login Page
exports.getLogin = (req, res) => {
  res.render('login', { error: null });
};

// Process Login
exports.postLogin = (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    db.get('SELECT * FROM users WHERE email = ?', [cleanEmail], async (err, user) => {
      if (err || !user) {
        return res.render('login', { error: 'Invalid email or password.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.render('login', { error: 'Invalid email or password.' });
      }

      req.session.userId = user.id;
      req.session.userEmail = user.email;
      res.redirect('/dashboard');
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.render('login', { error: 'An error occurred during login.' });
  }
};

// Process Logout
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
};
