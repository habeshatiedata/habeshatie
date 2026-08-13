const db = require('../config/db');
const bcrypt = require('bcryptjs');

exports.getRegister = (req, res) => {
  res.render('register', { error: null });
};

exports.postRegister = async (req, res) => {
  let { email, password, confirmPassword } = req.body;

  if (!email || !password || !confirmPassword) {
    return res.status(400).render('register', { error: 'All fields are required.' });
  }

  email = email.trim().toLowerCase();

  // Basic email format validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+/;
  if (!emailRegex.test(email)) {
    return res.status(400).render('register', { error: 'Please enter a valid email address.' });
  }

  if (password.length < 6) {
    return res.status(400).render('register', { error: 'Password must be at least 6 characters long.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).render('register', { error: 'Passwords do not match.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword], function(err) {
      if (err) {
        return res.status(400).render('register', { error: 'This email is already registered.' });
      }

      // Prevent session fixation by regenerating session on registration
      req.session.regenerate((regenErr) => {
        if (regenErr) {
          return res.status(500).render('register', { error: 'Server error during session initialization.' });
        }
        req.session.userId = this.lastID;
        req.session.userEmail = email;
        res.redirect('/dashboard/create');
      });
    });
  } catch (error) {
    res.status(500).render('register', { error: 'Server error during registration.' });
  }
};

exports.getLogin = (req, res) => {
  res.render('login', { error: null });
};

exports.postLogin = (req, res) => {
  let { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).render('login', { error: 'Please enter both email and password.' });
  }

  email = email.trim().toLowerCase();

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.status(400).render('login', { error: 'Invalid email or password.' });
    }

    try {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).render('login', { error: 'Invalid email or password.' });
      }

      // Prevent session fixation by regenerating session on login
      req.session.regenerate((regenErr) => {
        if (regenErr) {
          return res.status(500).render('login', { error: 'Server error during login.' });
        }
        req.session.userId = user.id;
        req.session.userEmail = user.email;
        res.redirect('/dashboard');
      });
    } catch (compareErr) {
      res.status(500).render('login', { error: 'Server error during login.' });
    }
  });
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
};
