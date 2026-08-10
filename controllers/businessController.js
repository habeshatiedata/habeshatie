const db = require('../config/db');

// City Coordinates map for fallback distance calculation
const CITY_COORDS = {
  'sunderland': { lat: 54.9069, lon: -1.3811 },
  'newcastle': { lat: 54.9783, lon: -1.6178 },
  'newcastle upon tyne': { lat: 54.9783, lon: -1.6178 },
  'london': { lat: 51.5074, lon: -0.1278 },
  'manchester': { lat: 53.4808, lon: -2.2426 },
  'birmingham': { lat: 52.4862, lon: -1.8904 },
  'leeds': { lat: 53.8008, lon: -1.5491 },
  'glasgow': { lat: 55.8642, lon: -4.2518 }
};

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
  let userLat = parseFloat(req.query.lat);
  let userLon = parseFloat(req.query.lon);
  const maxRadius = parseFloat(req.query.radius) || 25;

  // Resolve typed city name to lat/lon if lat/lon was not provided by browser GPS
  if ((isNaN(userLat) || isNaN(userLon)) && where) {
    const cityMatch = CITY_COORDS[where];
    if (cityMatch) {
      userLat = cityMatch.lat;
      userLon = cityMatch.lon;
    }
  }

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

    // Prioritize Featured then Online/Delivery
    results.sort((a, b) => {
      if (b.is_featured !== a.is_featured) return (b.is_featured || 0) - (a.is_featured || 0);
      const aOnline = (a.service_type === 'online' || a.service_type === 'delivery' || a.service_type === 'both') ? 1 : 0;
      const bOnline = (b.service_type === 'online' || b.service_type === 'delivery' || b.service_type === 'both') ? 1 : 0;
      return bOnline - aOnline;
    });

    if (!isNaN(userLat) && !isNaN(userLon) && !countryFilter) {
      results = results.filter(b => {
        // Online-only businesses available everywhere
        if (b.service_type === 'online' || b.service_type === 'delivery') {
          return true;
        }

        let bLat = parseFloat(b.latitude);
        let bLon = parseFloat(b.longitude);

        // Fallback coordinates lookup for businesses in DB missing lat/lon
        if ((isNaN(bLat) || isNaN(bLon)) && b.city) {
          const bCityKey = b.city.trim().toLowerCase();
          if (CITY_COORDS[bCityKey]) {
            bLat = CITY_COORDS[bCityKey].lat;
            bLon = CITY_COORDS[bCityKey].lon;
          }
        }

        if (isNaN(bLat) || isNaN(bLon)) {
          // If no lat/lon available, fall back to exact city name matching
          return b.city && b.city.toLowerCase() === where;
        }

        const distance = getDistanceInMiles(userLat, userLon, bLat, bLon);
        return distance <= maxRadius;
      });
    } else if (where && !countryFilter) {
      // Strict exact city match if geocoding coordinates are completely absent
      results = results.filter(b => 
        (b.service_type === 'online' || b.service_type === 'delivery') ||
        (b.city && b.city.toLowerCase().trim() === where)
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
