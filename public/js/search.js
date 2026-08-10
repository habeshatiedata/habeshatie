document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.getElementById('searchInput'); // Category select dropdown
  const locationInput = document.getElementById('locationInput');
  const radiusSelect = document.getElementById('radiusSelect');
  const cityDropdown = document.getElementById('cityDropdown');
  const businessContainer = document.querySelector('.business-grid') || document.querySelector('.business-list') || document.getElementById('businessList');

  let userLat = null;
  let userLon = null;

  // 1. Detect browser GPS on load & reverse-geocode city name
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLat = pos.coords.latitude;
        userLon = pos.coords.longitude;

        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLon}`)
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

  // 2. Fetch API Search Results
  function executeSearch() {
    const q = searchInput ? searchInput.value.trim() : '';
    const where = locationInput ? locationInput.value.trim() : '';
    const radius = radiusSelect ? radiusSelect.value : '25';

    let url = `/api/search?q=${encodeURIComponent(q)}&where=${encodeURIComponent(where)}&radius=${encodeURIComponent(radius)}`;

    if (userLat && userLon) {
      url += `&lat=${userLat}&lon=${userLon}`;
    }

    fetch(url)
      .then(res => res.json())
      .then(data => renderCards(data.results || []))
      .catch(err => console.error('Search error:', err));
  }

  // 3. Render Cards dynamically
  function renderCards(businesses) {
    if (!businessContainer) return;

    if (businesses.length === 0) {
      businessContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: #f8fafc; border-radius: 12px; margin-top: 20px;">
          <p style="font-size: 1.1rem; color: #64748b; font-weight: 500;">
            No businesses found within this location or mileage radius.
          </p>
        </div>`;
      return;
    }

    businessContainer.innerHTML = businesses.map(b => {
      const distTag = (b.distance !== undefined && b.distance !== null) 
        ? `<span style="color:#2563eb; font-weight:600; margin-left:6px;">(${b.distance.toFixed(1)} mi away)</span>` 
        : '';

      return `
        <div class="business-card" style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:16px;">
          <h3 style="margin:0 0 8px 0; font-size:1.1rem; color:#0f172a; font-weight:700;">${b.name || 'Business'}</h3>
          <p style="color:#64748b; font-size:0.85rem; margin:4px 0 12px 0;">
            📍 ${b.city || 'Location unavailable'}, ${b.country || 'UK'} ${distTag}
          </p>
          <p style="color:#334155; font-size:0.9rem; line-height:1.4; margin-bottom:12px;">
            ${(b.description || '').substring(0, 100)}...
          </p>
          <a href="/business/${b.id || b.slug}" style="display:inline-block; background:#10b981; color:#fff; text-decoration:none; padding:8px 16px; border-radius:6px; font-size:0.85rem; font-weight:600;">
            View Profile & Contact
          </a>
        </div>
      `;
    }).join('');
  }

  // 4. Live Event Listeners
  radiusSelect?.addEventListener('change', () => {
    executeSearch();
  });

  searchInput?.addEventListener('change', () => {
    executeSearch();
  });

  locationInput?.addEventListener('input', function () {
    const query = this.value.trim();
    userLat = null; // Reset GPS coordinates so typed text is geocoded fresh
    userLon = null;

    if (query.length < 1) {
      if (cityDropdown) cityDropdown.classList.add('hidden');
      executeSearch();
      return;
    }

    // Auto-search after user stops typing
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      executeSearch();
    }, 400);
  });
});
