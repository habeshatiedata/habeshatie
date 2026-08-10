document.addEventListener('DOMContentLoaded', function () {
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const locationInput = document.getElementById('locationInput');
  const radiusSelect = document.getElementById('radiusSelect');
  const cityDropdown = document.getElementById('cityDropdown');
  const businessGrid = document.getElementById('businessGrid');

  let currentLat = null;
  let currentLon = null;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        currentLat = pos.coords.latitude;
        currentLon = pos.coords.longitude;
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentLat}&lon=${currentLon}`)
          .then(res => res.json())
          .then(data => {
            if (data && data.address) {
              const detectedCity = data.address.city || data.address.town || data.address.village || data.address.county || '';
              if (locationInput && detectedCity && !locationInput.value) {
                locationInput.value = detectedCity;
              }
            }
            executeSearch();
          })
          .catch(() => executeSearch());
      },
      () => executeSearch(),
      { timeout: 5000 }
    );
  } else {
    executeSearch();
  }

  async function fetchCitiesFromDB(query) {
    if (!cityDropdown) return;

    const val = query.trim();
    if (!val) {
      hideCityDropdown();
      return;
    }

    try {
      const res = await fetch(`/api/cities?q=${encodeURIComponent(val)}`);
      const data = await res.json();
      const items = data.cities || [];

      if (items.length === 0) {
        hideCityDropdown();
        return;
      }

      cityDropdown.innerHTML = items.map(cityName => `
        <div class="city-item" data-city="${cityName}" style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; border-bottom: 1px solid #f1f5f9;">
          <span style="font-size: 1rem;">📍</span>
          <span style="font-size: 0.9rem; font-weight: 600; color: #1e293b;">${cityName}</span>
        </div>
      `).join('');

      cityDropdown.classList.remove('hidden');
      cityDropdown.style.display = 'block';
    } catch (err) {
      console.error('Error fetching autocomplete suggestions:', err);
    }
  }

  function hideCityDropdown() {
    if (!cityDropdown) return;
    setTimeout(() => {
      cityDropdown.innerHTML = '';
      cityDropdown.classList.add('hidden');
      cityDropdown.style.display = 'none';
    }, 200);
  }

  async function executeSearch() {
    const q = searchInput ? searchInput.value.trim() : '';
    const where = locationInput ? locationInput.value.trim() : '';
    const radius = radiusSelect ? radiusSelect.value : '25';

    let lat = currentLat;
    let lon = currentLon;

    if ((!lat || !lon) && where) {
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(where)}&limit=1`);
        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
          lat = parseFloat(geoData[0].lat);
          lon = parseFloat(geoData[0].lon);
        }
      } catch (err) {
        console.error('Geocoding error:', err);
      }
    }

    let url = `/api/search?q=${encodeURIComponent(q)}&where=${encodeURIComponent(where)}&radius=${encodeURIComponent(radius)}`;
    if (lat && lon) {
      url += `&lat=${lat}&lon=${lon}`;
    }

    try {
      const res = await fetch(url);
      const data = await res.json();
      renderCards(data.results || []);
    } catch (err) {
      console.error('Search fetch error:', err);
    }
  }

  function renderCards(businesses) {
    if (!businessGrid) return;

    if (!businesses || businesses.length === 0) {
      businessGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem 1rem; background: #fff; border-radius: 12px; border: 1px solid var(--border);">
          <p style="color: #64748b; font-size: 0.95rem;">No businesses found matching your request.</p>
        </div>`;
      return;
    }

    businessGrid.innerHTML = businesses.map(b => {
      const distTag = (b.distance !== undefined && b.distance !== null)
        ? `<span style="color:#2563eb; font-weight:600; margin-left:4px;">(${b.distance.toFixed(1)} mi away)</span>`
        : '';

      const photoUrl = b.photo || '/uploads/default.jpg';

      return `
        <div class="card">
          <img src="${photoUrl}" alt="${b.name || 'Business'}" class="card-img" />
          <div class="card-body">
            <span class="badge">${b.category || 'BUSINESS'}</span>
            <h3 style="margin-bottom: 0.5rem;">
              <a href="/b/${b.slug || b.id}" style="color: var(--primary); text-decoration: none;">${b.name || 'Business'}</a>
            </h3>
            <p style="color: #64748b; font-size: 0.85rem; margin-bottom: 0.75rem;">
              📍 ${b.city || ''}, ${b.country || 'UK'} ${distTag}
            </p>
            <a href="/b/${b.slug || b.id}" class="btn-whatsapp">View Profile & Contact</a>
          </div>
        </div>
      `;
    }).join('');
  }

  let searchTimer = null;
  let cityTimer = null;

  locationInput?.addEventListener('input', (e) => {
    currentLat = null;
    currentLon = null;

    clearTimeout(cityTimer);
    cityTimer = setTimeout(() => fetchCitiesFromDB(e.target.value), 200);

    clearTimeout(searchTimer);
    searchTimer = setTimeout(executeSearch, 350);
  });

  locationInput?.addEventListener('focus', (e) => {
    if (e.target.value.trim()) {
      fetchCitiesFromDB(e.target.value);
    }
  });

  locationInput?.addEventListener('blur', hideCityDropdown);

  cityDropdown?.addEventListener('mousedown', (e) => {
    const item = e.target.closest('.city-item');
    if (item) {
      const selectedCity = item.getAttribute('data-city');
      locationInput.value = selectedCity;
      currentLat = null;
      currentLon = null;
      hideCityDropdown();
      executeSearch();
    }
  });

  radiusSelect?.addEventListener('change', executeSearch);
  searchInput?.addEventListener('change', executeSearch);

  searchForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    hideCityDropdown();
    executeSearch();
  });
});
