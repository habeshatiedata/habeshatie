const db = require('../config/db');

// Haversine formula to compute distance in miles
function getDistanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

const CITY_COORDS = {
  'sunderland': { lat: 54.9069, lon: -1.3811 },
  'newcastle': { lat: 54.9783, lon: -1.6178 },
  'newcastle upon tyne': { lat: 54.9783, lon: -1.6178 },
  'london': { lat: 51.5074, lon: -0.1278 },
  'manchester': { lat: 53.4808, lon: -2.2426 },
  'birmingham': { lat: 52.4862, lon: -1.8904 }
};

const apiSearch = async (req, res) => {
  const q = (req.query.q || '').trim();
  const where = (req.query.where || '').trim();
  let userLat = parseFloat(req.query.lat);
  let userLon = parseFloat(req.query.lon);
  const radius = parseFloat(req.query.radius) || 25;

  let sql = 'SELECT * FROM businesses WHERE 1=1';
  let params = [];

  if (q && q !== 'All Businesses & Services') {
    sql += ' AND (category LIKE ? OR name LIKE ? OR description LIKE ?)';
    const term = `%${q}%`;
    params.push(term, term, term);
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ results: [] });

    let results = rows || [];

    // Filter strictly by distance if coordinates exist
    if (!isNaN(userLat) && !isNaN(userLon)) {
      results = results.filter(b => {
        let bLat = parseFloat(b.latitude);
        let bLon = parseFloat(b.longitude);

        if ((isNaN(bLat) || isNaN(bLon)) && b.city) {
          const cityKey = b.city.trim().toLowerCase();
          if (CITY_COORDS[cityKey]) {
            bLat = CITY_COORDS[cityKey].lat;
            bLon = CITY_COORDS[cityKey].lon;
          }
        }

        if (isNaN(bLat) || isNaN(bLon)) return false;

        const dist = getDistanceMiles(userLat, userLon, bLat, bLon);
        b.distance = dist;
        return dist <= radius;
      });

      results.sort((a, b) => a.distance - b.distance);
    } else if (where) {
      results = results.filter(b => b.city && b.city.toLowerCase().trim() === where.toLowerCase().trim());
    }

    res.json({ results });
  });
};

const getDirectory = (req, res) => {
  db.all('SELECT * FROM businesses ORDER BY created_at DESC', [], (err, businesses) => {
    res.render('index', { businesses: businesses || [] });
  });
};

const getCategories = (req, res) => {
  db.all('SELECT DISTINCT category FROM businesses WHERE category IS NOT NULL', [], (err, rows) => {
    res.json({ categories: rows ? rows.map(r => r.category) : [] });
  });
};

const getCities = (req, res) => {
  const q = (req.query.q || '').trim();
  db.all('SELECT DISTINCT city FROM businesses WHERE city LIKE ? LIMIT 10', [`%${q}%`], (err, rows) => {
    res.json({ cities: rows ? rows.map(r => r.city) : [] });
  });
};

module.exports = { getDirectory, getCategories, getCities, apiSearch };
