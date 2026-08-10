const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db/habeshatie.db');
const db = new sqlite3.Database(dbPath);

const CITY_COORDS = {
  'sunderland': { lat: 54.9069, lon: -1.3811 },
  'newcastle': { lat: 54.9783, lon: -1.6178 },
  'newcastle upon tyne': { lat: 54.9783, lon: -1.6178 },
  'london': { lat: 51.5074, lon: -0.1278 },
  'manchester': { lat: 53.4808, lon: -2.2426 },
  'birmingham': { lat: 52.4862, lon: -1.8904 }
};

db.serialize(() => {
  db.run("ALTER TABLE businesses ADD COLUMN latitude REAL", () => {});
  db.run("ALTER TABLE businesses ADD COLUMN longitude REAL", () => {});
  db.run("ALTER TABLE businesses ADD COLUMN address TEXT", () => {});

  db.all("SELECT id, city, name FROM businesses", [], (err, rows) => {
    if (err) return console.error('DB Error:', err);

    rows.forEach(row => {
      const cityKey = (row.city || '').trim().toLowerCase();
      const coords = CITY_COORDS[cityKey];

      if (coords) {
        db.run(
          "UPDATE businesses SET latitude = ?, longitude = ? WHERE id = ?",
          [coords.lat, coords.lon, row.id],
          (err) => {
            if (!err) console.log(`✓ GPS Updated for ${row.name} (${row.city})`);
          }
        );
      }
    });
  });
});
