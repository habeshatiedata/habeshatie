const bcrypt = require('bcryptjs');
const db = require('../config/db');

// Render Register Page
exports.getRegister = (req, res) => {
  res.render('register', { error: null });
};

// Handle Registration
exports.postRegister = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.render('register', { error: 'Please provide both email and password.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO users (email, password) VALUES (?, ?)',
      [email.toLowerCase().trim(), hashedPassword],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.render('register', { error: 'Email is already registered.' });
          }
          return res.render('register', { error: 'Error creating account.' });
        }
        req.session.userId = this.lastID;
        req.session.userEmail = email;
        res.redirect('/dashboard');
      }
    );
  } catch (err) {
    res.render('register', { error: 'Server error during registration.' });
  }
};

// Render Login Page
exports.getLogin = (req, res) => {
  res.render('login', { error: null });
};

// Handle Login
exports.postLogin = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.render('login', { error: 'Please enter email and password.' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()], async (err, user) => {
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
};

// Handle Logout
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
};
