document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const locationInput = document.getElementById('locationInput');
  const radiusSelect = document.getElementById('radiusSelect');
  const locateBtn = document.getElementById('locateBtn');
  const cardGrid = document.querySelector('.grid');

  let currentLat = null;
  let currentLon = null;

  function applyPlaceholder(img) {
    if (img.dataset.fallbackApplied) return;
    img.dataset.fallbackApplied = 'true';
    img.onerror = null;
    img.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"%3E%3Crect width="400" height="200" fill="%23f1f5f9"/%3E%3Ctext x="50%25" y="50%25" fill="%2394a3b8" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle" dy=".3em"%3EHabeshatie Business%3C/text%3E%3C/svg%3E';
  }

  function fixBrokenImages(container = document) {
    const images = container.querySelectorAll('img');
    images.forEach(img => {
      if (img.complete && img.naturalWidth === 0) applyPlaceholder(img);
      img.onerror = function() { applyPlaceholder(this); };
    });
  }

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

  async function executeSearch() {
    const q = searchInput ? searchInput.value.trim() : '';
    const where = locationInput ? locationInput.value.trim() : '';
    const radius = radiusSelect ? radiusSelect.value : '10';

    try {
      const params = new URLSearchParams();
      if (q) params.append('q', q);
      if (where) params.append('where', where);
      if (radius) params.append('radius', radius);
      if (currentLat && currentLon) {
        params.append('lat', currentLat);
        params.append('lon', currentLon);
      }

      const res = await fetch('/api/search?' + params.toString());
      if (res.ok) {
        const data = await res.json();
        renderCards(data.results || []);
      }
    } catch (err) {
      console.error('API search error:', err);
    }
  }

  function renderCards(businesses) {
    if (!cardGrid) return;
    cardGrid.innerHTML = '';

    if (!businesses || businesses.length === 0) {
      cardGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 2.5rem 1rem; background: #fff; border-radius: 12px; border: 1px solid var(--border);">
          <p style="color: #64748b; font-size: 0.95rem;">No businesses found matching your request.</p>
        </div>
      `;
      return;
    }

    businesses.forEach(b => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <img src="${b.photo || ''}" alt="${b.name || 'Business'}" class="card-img" />
        <div class="card-body">
          <span class="badge">${b.category || 'Business'}</span>
          <h3 style="margin-bottom: 0.5rem;">
            <a href="/b/${b.slug}" style="color: var(--primary); text-decoration: none;">${b.name}</a>
          </h3>
          <p style="color: #64748b; font-size: 0.85rem; margin-bottom: 0.75rem;">📍 ${b.city || ''}, ${b.country || 'UK'}</p>
          <a href="/b/${b.slug}" class="btn-whatsapp">View Profile & Contact</a>
        </div>
      `;
      cardGrid.appendChild(card);
    });

    fixBrokenImages(cardGrid);
  }

  function fetchGPSLocation() {
    if (!navigator.geolocation) return;

    if (locateBtn) locateBtn.textContent = '...';

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          currentLat = pos.coords.latitude;
          currentLon = pos.coords.longitude;

          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentLat}&lon=${currentLon}`);
          const data = await res.json();
          const addr = data.address || {};
          const detectedCity = addr.city || addr.town || addr.village || addr.suburb || addr.county || '';
          
          if (locationInput && detectedCity) {
            locationInput.value = detectedCity;
          }
          executeSearch();
        } catch (err) {
          console.error('GPS error:', err);
        } finally {
          if (locateBtn) locateBtn.textContent = 'GPS';
        }
      },
      () => {
        if (locateBtn) locateBtn.textContent = 'GPS';
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  // Auto-run on initialization
  fixBrokenImages();
  loadCategories();
  fetchGPSLocation(); // Auto detects user city on page load

  // Real-time event triggers
  if (searchInput) searchInput.addEventListener('change', executeSearch);
  
  if (locationInput) {
    let timeout = null;
    locationInput.addEventListener('input', () => {
      currentLat = null;
      currentLon = null;
      clearTimeout(timeout);
      timeout = setTimeout(executeSearch, 300);
    });
  }

  if (radiusSelect) radiusSelect.addEventListener('change', executeSearch);

  if (locateBtn) {
    locateBtn.type = 'button';
    locateBtn.onclick = fetchGPSLocation;
  }
});
