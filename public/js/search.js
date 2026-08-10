document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const locationInput = document.getElementById('locationInput');
  const radiusSelect = document.getElementById('radiusSelect');
  const locateBtn = document.getElementById('locateBtn');

  // Find the container where cards are displayed
  const cardGrid = document.querySelector('.grid, .business-grid, .card-container') || 
                   (document.querySelector('.business-card, .card')?.parentElement);

  // Fix image fallbacks
  function fixBrokenImages(container = document) {
    const images = container.querySelectorAll('img');
    images.forEach(img => {
      if (img.complete && img.naturalWidth === 0) applyPlaceholder(img);
      img.onerror = function() { applyPlaceholder(this); };
    });
  }

  function applyPlaceholder(img) {
    if (img.dataset.fallbackApplied) return;
    img.dataset.fallbackApplied = 'true';
    img.onerror = null;
    img.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"%3E%3Crect width="400" height="200" fill="%23f1f5f9"/%3E%3Ctext x="50%25" y="50%25" fill="%2394a3b8" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle" dy=".3em"%3EHabeshatie Business%3C/text%3E%3C/svg%3E';
  }

  // Load Categories safely
  async function loadCategories() {
    if (!searchInput) return;
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) return;
      const data = await res.json();
      const categories = Array.isArray(data) ? data : (data.categories || []);
      if (categories.length > 0) {
        const currentVal = searchInput.value;
        searchInput.innerHTML = '<option value="">All Businesses & Services</option>';
        categories.forEach(cat => {
          const opt = document.createElement('option');
          opt.value = typeof cat === 'string' ? cat : (cat.name || cat.category || cat);
          opt.textContent = opt.value;
          if (opt.value.toLowerCase() === currentVal.toLowerCase()) opt.selected = true;
          searchInput.appendChild(opt);
        });
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  }

  // Execute unified search query
  async function executeSearch() {
    const q = searchInput ? searchInput.value.trim() : '';
    const loc = locationInput ? locationInput.value.trim() : '';
    const rad = radiusSelect ? radiusSelect.value : '10';

    // 1. Send query parameters to backend search API
    try {
      const params = new URLSearchParams({ q: q, location: loc, radius: rad });
      const res = await fetch(`/api/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const results = data.businesses || data.results || (Array.isArray(data) ? data : null);
        if (results && cardGrid) {
          renderCards(results);
          return;
        }
      }
    } catch (err) {
      console.error('API search failed, falling back to static filter:', err);
    }

    // 2. Client-side fallback filter
    fallbackFilter(q, loc);
  }

  function renderCards(businesses) {
    if (!cardGrid) return;
    cardGrid.innerHTML = '';

    if (!businesses || businesses.length === 0) {
      cardGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #64748b;"><h3>No businesses found</h3><p>Try increasing your search distance or clearing filters.</p></div>';
      return;
    }

    businesses.forEach(b => {
      const card = document.createElement('div');
      card.className = 'business-card card';
      card.innerHTML = `
        <div style="height: 180px; background: #f1f5f9; overflow: hidden;">
          <img src="${b.image || b.logo || ''}" alt="${b.name || 'Business'}" style="width: 100%; height: 100%; object-fit: cover;">
        </div>
        <div style="padding: 1.25rem;">
          <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">${b.category || 'Business'}</span>
          <h3 style="font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 0.25rem 0 0.5rem 0;">${b.name}</h3>
          <p style="font-size: 0.875rem; color: #64748b; margin: 0 0 1rem 0;">📍 ${b.city || b.location || 'UK'}</p>
          <a href="/business/${b.slug || b._id || b.id}" style="display: block; width: 100%; text-align: center; background: #22c55e; color: #fff; text-decoration: none; font-weight: 600; padding: 0.75rem; border-radius: 0.5rem;">View Profile & Contact</a>
        </div>
      `;
      cardGrid.appendChild(card);
    });

    fixBrokenImages(cardGrid);
  }

  function fallbackFilter(category, location) {
    const cards = document.querySelectorAll('.business-card, .card');
    const catQuery = category.toLowerCase();
    const locQuery = location.toLowerCase();

    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      const matchesCat = !catQuery || text.includes(catQuery) || 
                         (catQuery.includes('hair') && text.includes('barber')) ||
                         (catQuery.includes('barber') && text.includes('hair'));
      
      const matchesLoc = !locQuery || text.includes(locQuery);

      if (matchesCat && (matchesLoc || catQuery)) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  }

  // Handle GPS location click
  function handleGPS(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    if (locateBtn) locateBtn.textContent = '...';

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          const data = await res.json();
          const city = data.address.city || data.address.town || data.address.village || data.address.postcode || '';
          if (locationInput && city) {
            locationInput.value = city;
          }
          executeSearch();
        } catch (err) {
          console.error('GPS Reverse geocode error:', err);
        } finally {
          if (locateBtn) locateBtn.textContent = 'GPS';
        }
      },
      (err) => {
        if (locateBtn) locateBtn.textContent = 'GPS';
        if (err.code === err.PERMISSION_DENIED) {
          alert('Location access is currently blocked in your browser settings for habeshatie.com.\n\nTo allow access:\n1. Click the Tune/Lock icon next to https://habeshatie.com in your address bar.\n2. Set Location to "Allow".\n3. Refresh the page.');
        } else {
          alert('Unable to retrieve location. Please check your system location settings.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  // Init
  fixBrokenImages();
  loadCategories();

  // Event handlers for Enter key & inputs
  [searchInput, locationInput, radiusSelect].forEach(element => {
    if (!element) return;
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeSearch();
      }
    });
    element.addEventListener('change', executeSearch);
  });

  if (locateBtn) {
    locateBtn.setAttribute('type', 'button');
    locateBtn.onclick = handleGPS;
  }
});
