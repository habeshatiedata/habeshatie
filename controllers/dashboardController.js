const db = require('../config/db');
const { parsePhoneNumberFromString } = require('libphonenumber-js');

// Comprehensive ISO 3166-1 alpha-2 mapping for global Habesha diaspora hubs
const countryToAlpha2 = {
  // North America
  "United States": "US",
  "Canada": "CA",
  
  // Europe
  "United Kingdom": "GB",
  "Germany": "DE",
  "Sweden": "SE",
  "Switzerland": "CH",
  "Netherlands": "NL",
  "Norway": "NO",
  "France": "FR",
  "Italy": "IT",
  
  // Middle East & Gulf
  "Saudi Arabia": "SA",
  "United Arab Emirates": "AE",
  "Israel": "IL",
  
  // Horn of Africa & Africa
  "Ethiopia": "ET",
  "Eritrea": "ER",
  "South Africa": "ZA",
  "Kenya": "KE",
  "Sudan": "SD",
  
  // Oceania
  "Australia": "AU"
};

exports.getDashboard = (req, res) => {
  const userId = req.session.userId;
  db.all('SELECT * FROM businesses WHERE user_id = ?', [userId], (err, businesses) => {
    if (err) {
      return res.status(500).send('Database error.');
    }
    res.render('dashboard', { businesses });
  });
};

exports.getCreateBusiness = (req, res) => {
  res.render('business-create', { error: null, formData: {} });
};

exports.postCreateBusiness = (req, res) => {
  const userId = req.session.userId;
  let { name, category, country, city, phone, languages, description } = req.body;
  const photo = req.file ? `/uploads/${req.file.filename}` : '';

  const countryCode = countryToAlpha2[country];

  if (!countryCode) {
    return res.render('business-create', {
      error: 'Please select a valid supported country.',
      formData: { name, category, country, city, phone, languages, description }
    });
  }

  const phoneNumber = parsePhoneNumberFromString(phone, countryCode);

  if (!phoneNumber || !phoneNumber.isValid()) {
    return res.render('business-create', {
      error: `Invalid phone number for ${country}. Please enter a valid local or international phone format.`,
      formData: { name, category, country, city, phone, languages, description }
    });
  }

  const formattedPhone = phoneNumber.format('E.164');

  db.run(
    `INSERT INTO businesses (user_id, name, category, country, city, phone, languages, description, photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, name, category, country, city, formattedPhone, languages, description, photo],
    (err) => {
      if (err) {
        return res.status(500).send('Error saving business to database.');
      }
      res.redirect('/dashboard');
    }
  );
};

exports.getEditBusiness = (req, res) => {
  const businessId = req.params.id;
  const userId = req.session.userId;

  db.get('SELECT * FROM businesses WHERE id = ? AND user_id = ?', [businessId, userId], (err, business) => {
    if (err || !business) {
      return res.status(404).send('Business not found or unauthorized.');
    }
    res.render('business-create', { business, error: null });
  });
};

exports.postEditBusiness = (req, res) => {
  const businessId = req.params.id;
  const userId = req.session.userId;
  let { name, category, country, city, phone, languages, description } = req.body;

  const countryCode = countryToAlpha2[country];

  if (!countryCode) {
    return res.render('business-create', {
      error: 'Please select a valid supported country.',
      business: { id: businessId, name, category, country, city, phone, languages, description }
    });
  }

  const phoneNumber = parsePhoneNumberFromString(phone, countryCode);

  if (!phoneNumber || !phoneNumber.isValid()) {
    return res.render('business-create', {
      error: `Invalid phone number for ${country}. Please enter a valid phone number.`,
      business: { id: businessId, name, category, country, city, phone, languages, description }
    });
  }

  const formattedPhone = phoneNumber.format('E.164');

  if (req.file) {
    const photoPath = `/uploads/${req.file.filename}`;
    const query = `UPDATE businesses SET name = ?, category = ?, country = ?, city = ?, phone = ?, languages = ?, description = ?, photo = ? WHERE id = ? AND user_id = ?`;
    db.run(query, [name, category, country, city, formattedPhone, languages, description, photoPath, businessId, userId], (err) => {
      if (err) {
        return res.status(500).send('Error updating business.');
      }
      res.redirect('/dashboard');
    });
  } else {
    const query = `UPDATE businesses SET name = ?, category = ?, country = ?, city = ?, phone = ?, languages = ?, description = ? WHERE id = ? AND user_id = ?`;
    db.run(query, [name, category, country, city, formattedPhone, languages, description, businessId, userId], (err) => {
      if (err) {
        return res.status(500).send('Error updating business.');
      }
      res.redirect('/dashboard');
    });
  }
};

exports.deleteBusiness = (req, res) => {
  const businessId = req.params.id;
  const userId = req.session.userId;

  db.run('DELETE FROM businesses WHERE id = ? AND user_id = ?', [businessId, userId], (err) => {
    if (err) {
      return res.status(500).send('Error deleting business.');
    }
    res.redirect('/dashboard');
  });
};
