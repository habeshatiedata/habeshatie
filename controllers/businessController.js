const db = require('../config/db');

function getDistanceInMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const getDirectory = (req, res) => {
  const { search, category, country } = req.query;
  let query = 'SELECT * FROM businesses WHERE 1=1';
  let params = [];

  if (search) {
    query += ' AND (name LIKE ? OR description LIKE ? OR city LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (country) {
    query += ' AND country = ?';
    params.push(country);
  }

  query += ' ORDER BY is_featured DESC, created_at DESC';

  db.all(query, params, (err, businesses) => {
    if (err) businesses = [];
    res.render('index', { businesses, search, category, country });
  });
};

const getCategories = (req, res) => {
  try {
    const query = `SELECT DISTINCT category FROM businesses WHERE category IS NOT NULL AND category != '' ORDER BY category ASC`;
    db.all(query, [], (err, rows) => {
      if (err) return res.status(500).json({ categories: [] });
      const categories = rows ? rows.map(r => r.category) : [];
      res.json({ categories });
    });
  } catch (error) {
    res.status(500).json({ categories: [] });
  }
};

// Purely dynamic city query directly from registered businesses
const getCities = (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ cities: [] });

  const query = `
    SELECT DISTINCT city 
    FROM businesses 
    WHERE city LIKE ? AND city IS NOT NULL AND TRIM(city) != '' 
    ORDER BY city ASC 
    LIMIT 10
  `;

  db.all(query, [`%${q}%`], (err, rows) => {
    if (err) {
      console.error('Error fetching dynamic cities:', err);
      return res.status(500).json({ cities: [] });
    }
    const cities = rows ? rows.map(r => r.city.trim()) : [];
    res.json({ cities });
  });
};

const apiSearch = (req, res) => {
  const q = (req.query.q || req.query.search || '').trim();
  const where = (req.query.where || req.query.location || '').trim().toLowerCase();
  const countryFilter = (req.query.country || '').trim().toLowerCase();
  const userLat = parseFloat(req.query.lat);
  const userLon = parseFloat(req.query.lon);
  const maxRadius = parseFloat(req.query.radius) || 25; // Default 25 miles

  let query = 'SELECT * FROM businesses WHERE 1=1';
  let params = [];

  if (q && q !== 'All Businesses & Services') {
    query += ' AND (name LIKE ? OR category LIKE ? OR description LIKE ?)';
    const term = `%${q}%`;
    params.push(term, term, term);
  }

  if (countryFilter) {
    query += ' AND LOWER(country) LIKE ?';
    params.push(`%${countryFilter}%`);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Search API Error:', err);
      return res.status(500).json({ results: [] });
    }

    let results = rows || [];

    // Prioritize: Featured/Recommended first, then Online/Delivery
    results.sort((a, b) => {
      if (b.is_featured !== a.is_featured) return (b.is_featured || 0) - (a.is_featured || 0);
      const aOnline = (a.service_type === 'online' || a.service_type === 'delivery' || a.service_type === 'both') ? 1 : 0;
      const bOnline = (b.service_type === 'online' || b.service_type === 'delivery' || b.service_type === 'both') ? 1 : 0;
      return bOnline - aOnline;
    });

    if (!isNaN(userLat) && !isNaN(userLon) && !countryFilter) {
      results = results.filter(b => {
        // Online/delivery businesses are available regardless of strict distance radius
        if (b.service_type === 'online' || b.service_type === 'delivery' || b.service_type === 'both') {
          return true;
        }

        let bLat = parseFloat(b.latitude);
        let bLon = parseFloat(b.longitude);
        if (isNaN(bLat) || isNaN(bLon)) return false;

        const distance = getDistanceInMiles(userLat, userLon, bLat, bLon);
        return distance <= maxRadius;
      });
    } else if (where && !countryFilter) {
      results = results.filter(b => 
        (b.service_type === 'online' || b.service_type === 'delivery' || b.service_type === 'both') ||
        (b.city && b.city.toLowerCase().includes(where)) ||
        (b.country && b.country.toLowerCase().includes(where)) ||
        (b.name && b.name.toLowerCase().includes(where))
      );
    }

    res.json({ results });
  });
};

module.exports = {
  getDirectory,
  getCategories,
  getCities,
  apiSearch
};
