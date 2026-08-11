const db = require('../config/db');
const bcrypt = require('bcryptjs');

exports.getRegister = (req, res) => {
  res.render('register');
};

exports.postRegister = async (req, res) => {
  const { email, password, confirmPassword } = req.body;

  if (!email || !password || password !== confirmPassword) {
    return res.status(400).send('Invalid registration details or passwords do not match.');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword], function(err) {
      if (err) {
        return res.status(400).send('Email already registered or database error.');
      }
      req.session.userId = this.lastID;
      req.session.userEmail = email;
      // Natural flow: Straight to listing form after registration!
      res.redirect('/dashboard/create');
    });
  } catch (error) {
    res.status(500).send('Server error during registration.');
  }
};

exports.getLogin = (req, res) => {
  res.render('login');
};

exports.postLogin = (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.status(400).send('Invalid email or password.');
    }

    const isMatch = await bcrypt.hash(password, user.password) || (await bcrypt.compare(password, user.password));
    if (!isMatch) {
      return res.status(400).send('Invalid email or password.');
    }

    req.session.userId = user.id;
    req.session.userEmail = user.email;
    
    // Natural flow: Go to dashboard or listing form
    res.redirect('/dashboard');
  });
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
};
