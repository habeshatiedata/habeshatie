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

const cityCoords = {
  'sunderland': { lat: 54.9069, lon: -1.3811 },
  'newcastle': { lat: 54.9783, lon: -1.6178 },
  'london': { lat: 51.5074, lon: -0.1278 },
  'manchester': { lat: 53.4808, lon: -2.2426 },
  'birmingham': { lat: 52.4862, lon: -1.8904 },
  'leeds': { lat: 53.8008, lon: -1.5491 },
  'glasgow': { lat: 55.8642, lon: -4.2518 },
  'edinburgh': { lat: 55.9533, lon: -3.1883 }
};

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

const getCities = (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ cities: [] });

  const query = `SELECT DISTINCT city FROM businesses WHERE city LIKE ? AND city IS NOT NULL AND city != '' LIMIT 8`;
  db.all(query, [`${q}%`], (err, rows) => {
    if (err) return res.status(500).json({ cities: [] });
    const cities = rows ? rows.map(r => r.city) : [];
    res.json({ cities });
  });
};

const apiSearch = (req, res) => {
  const q = (req.query.q || req.query.search || '').trim();
  const where = (req.query.where || req.query.location || '').trim().toLowerCase();
  const userLat = parseFloat(req.query.lat);
  const userLon = parseFloat(req.query.lon);
  const maxRadius = parseFloat(req.query.radius) || 10;

  let query = 'SELECT * FROM businesses WHERE 1=1';
  let params = [];

  if (q && q !== 'All Businesses & Services') {
    query += ' AND (name LIKE ? OR category LIKE ? OR description LIKE ?)';
    const term = `%${q}%`;
    params.push(term, term, term);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Search API Error:', err);
      return res.status(500).json({ results: [] });
    }

    let results = rows || [];
    let targetLat = userLat;
    let targetLon = userLon;

    if ((isNaN(targetLat) || isNaN(targetLon)) && where) {
      for (const [city, coords] of Object.entries(cityCoords)) {
        if (where.includes(city)) {
          targetLat = coords.lat;
          targetLon = coords.lon;
          break;
        }
      }
    }

    if (!isNaN(targetLat) && !isNaN(targetLon)) {
      results = results.filter(b => {
        let bLat = parseFloat(b.latitude);
        let bLon = parseFloat(b.longitude);

        if ((isNaN(bLat) || isNaN(bLon)) && b.city) {
          const cityKey = b.city.trim().toLowerCase();
          if (cityCoords[cityKey]) {
            bLat = cityCoords[cityKey].lat;
            bLon = cityCoords[cityKey].lon;
          }
        }

        if (isNaN(bLat) || isNaN(bLon)) return true;

        const distance = getDistanceInMiles(targetLat, targetLon, bLat, bLon);
        return distance <= maxRadius;
      });
    } else if (where) {
      results = results.filter(b => 
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
