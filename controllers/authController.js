const bcrypt = require('bcryptjs');
const User = require('../models/User'); // Adjust path if your User model location differs

// Render Registration Page
exports.getRegister = (req, res) => {
  res.render('register', { error: null });
};

// Process Registration
exports.postRegister = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

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

    // 5. Check if user already exists -> prompt to log in
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.render('register', { 
        error: 'An account with that email already exists. Please login instead.' 
      });
    }

    // Hash password and save new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      email: email.toLowerCase().trim(),
      password: hashedPassword
    });

    await newUser.save();

    // Auto log-in after registration
    req.session.userId = newUser._id;
    req.session.userEmail = newUser.email;

    res.redirect('/dashboard');
  } catch (err) {
    console.error('Registration Error:', err);
    res.render('register', { error: 'An error occurred during registration. Please try again.' });
  }
};

// Render Login Page
exports.getLogin = (req, res) => {
  res.render('login', { error: null });
};

// Process Login
exports.postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.render('login', { error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('login', { error: 'Invalid email or password.' });
    }

    req.session.userId = user._id;
    req.session.userEmail = user.email;

    res.redirect('/dashboard');
  } catch (err) {
    console.error('Login Error:', err);
    res.render('login', { error: 'An error occurred during login. Please try again.' });
  }
};

// Process Logout
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
};
