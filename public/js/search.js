document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.getElementById('searchInput');
  const locationInput = document.getElementById('locationInput');
  const radiusSelect = document.getElementById('radiusSelect');
  const businessContainer = document.querySelector('.business-grid') || document.querySelector('.business-list') || document.getElementById('businessList');

  let currentLat = null;
  let currentLon = null;

  // 1. Initial browser GPS check
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        currentLat = pos.coords.latitude;
        currentLon = pos.coords.longitude;

        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentLat}&lon=${currentLon}`)
          .then(res => res.json())
          .then(data => {
            if (data && data.address) {
              const city = data.address.city || data.address.town || data.address.village || data.address.county || '';
              if (locationInput && city && !locationInput.value) {
                locationInput.value = city;
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

  // 2. Main Search Execution Function
  async function executeSearch() {
    const q = searchInput ? searchInput.value.trim() : '';
    const where = locationInput ? locationInput.value.trim() : '';
    const radius = radiusSelect ? radiusSelect.value : '25';

    let lat = currentLat;
    let lon = currentLon;

    // Geocode typed location if GPS coordinates aren't set
    if ((!lat || !lon) && where) {
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(where)}&limit=1`);
        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
          lat = geoData[0].lat;
          lon = geoData[0].lon;
        }
      } catch (err) {
        console.error('Client geocoding error:', err);
      }
    }

    let url = `/api/search?q=${encodeURIComponent(q)}&where=${encodeURIComponent(where)}&radius=${encodeURIComponent(radius)}`;
    if (lat && lon) {
      url += `&lat=${lat}&lon=${lon}`;
    }

    fetch(url)
      .then(res => res.json())
      .then(data => renderCards(data.results || []))
      .catch(err => console.error('Search error:', err));
  }

  // 3. Render Cards
  function renderCards(businesses) {
    if (!businessContainer) return;

    if (businesses.length === 0) {
      businessContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #f8fafc; border-radius: 12px; margin-top: 20px;">
          <p style="font-size: 1.1rem; color: #64748b; font-weight: 500;">No businesses found within this distance.</p>
        </div>`;
      return;
    }

    businessContainer.innerHTML = businesses.map(b => {
      const distTag = (b.distance !== undefined && b.distance !== null)
        ? `<span style="color:#2563eb; font-weight:600; margin-left:6px;">(${b.distance.toFixed(1)} mi)</span>`
        : '';

      const imageTag = b.image_url 
        ? `<img src="${b.image_url}" alt="${b.name}" style="width:100%; height:140px; object-fit:cover; border-radius:8px 8px 0 0;" onError="this.style.display='none';">` 
        : '';

      return `
        <div class="business-card" style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
          ${imageTag}
          <div style="padding:16px;">
            <span style="font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase;">${b.category || 'BUSINESS'}</span>
            <h3 style="margin:4px 0 8px 0; font-size:1.1rem; font-weight:700; color:#0f172a;">${b.name || 'Business'}</h3>
            <p style="color:#64748b; font-size:0.85rem; margin-bottom:12px;">
              📍 ${b.city || ''}, ${b.country || 'UK'} ${distTag}
            </p>
            <a href="/business/${b.id || b.slug}" style="display:block; text-align:center; background:#10b981; color:#fff; text-decoration:none; padding:10px; border-radius:6px; font-weight:600;">
              View Profile & Contact
            </a>
          </div>
        </div>
      `;
    }).join('');
  }

  // Live Listeners
  radiusSelect?.addEventListener('change', () => {
    executeSearch();
  });

  searchInput?.addEventListener('change', () => {
    executeSearch();
  });

  locationInput?.addEventListener('change', () => {
    currentLat = null; // Clear GPS coords when user types a new location manually
    currentLon = null;
    executeSearch();
  });
});
