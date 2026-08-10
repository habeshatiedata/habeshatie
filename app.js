const citiesRouter = require('./routes/cities');
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/authRoutes');
const businessRoutes = require('./routes/businessRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session Handling
app.use(session({
  secret: 'habeshatie-brand-ownership-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

// Global variables for templates
app.use((req, res, next) => {
  res.locals.user = req.session.userId || null;
  res.locals.userEmail = req.session.userEmail || null;
  next();
});

// Route Handlers
app.use('/', authRoutes);
app.use('/', businessRoutes);
app.use('/', dashboardRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', brand: 'Habeshatie', timestamp: new Date() });
});

app.use('/api', citiesRouter);

app.listen(PORT, () => {
  console.log(`🚀 Habeshatie Server running cleanly on http://localhost:${PORT}`);
});
