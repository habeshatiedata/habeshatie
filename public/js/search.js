document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.getElementById('searchInput');
  const locationInput = document.getElementById('locationInput');
  const radiusSelect = document.getElementById('radiusSelect');
  const cityDropdown = document.getElementById('cityDropdown');
  const businessContainer = document.querySelector('.business-grid') || document.getElementById('businessList');

  let currentResults = [];
  let displayedCount = 5;

  function fetchSearchResults(overrideParams = {}) {
    const q = searchInput ? searchInput.value : '';
    const where = locationInput ? locationInput.value : '';
    const radius = radiusSelect ? radiusSelect.value : '25';

    let url = `/api/search?q=${encodeURIComponent(q)}&where=${encodeURIComponent(where)}&radius=${encodeURIComponent(radius)}`;
    
    if (overrideParams.country) {
      url += `&country=${encodeURIComponent(overrideParams.country)}`;
    }

    fetch(url)
      .then(res => res.json())
      .then(data => {
        currentResults = data.results || [];
        displayedCount = 5;
        renderResults();
      })
      .catch(err => console.error('Search fetch error:', err));
  }

  function renderResults() {
    if (!businessContainer) return;

    if (currentResults.length === 0) {
      businessContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: #f8fafc; border-radius: 12px; margin-top: 20px;">
          <p style="font-size: 1.1rem; color: #475569; margin-bottom: 16px; font-weight: 500;">
            No businesses found within this area.
          </p>
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button id="btnExploreUK" style="background: #2563eb; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer;">
              Explore UK Businesses
            </button>
            <button id="btnExploreWorldwide" style="background: #059669; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer;">
              Explore Worldwide
            </button>
          </div>
        </div>
      `;

      document.getElementById('btnExploreUK')?.addEventListener('click', () => {
        if (locationInput) locationInput.value = '';
        fetchSearchResults({ country: 'UK' });
      });

      document.getElementById('btnExploreWorldwide')?.addEventListener('click', () => {
        if (locationInput) locationInput.value = '';
        fetchSearchResults();
      });

      return;
    }

    const itemsToRender = currentResults.slice(0, displayedCount);
    let html = itemsToRender.map(b => createBusinessCardHTML(b)).join('');

    if (currentResults.length > displayedCount) {
      html += `
        <div style="grid-column: 1 / -1; text-align: center; margin-top: 24px;">
          <button id="btnSeeMore" style="background: #10b981; color: white; border: none; padding: 12px 28px; font-size: 1rem; border-radius: 8px; cursor: pointer; font-weight: 600; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
            See More (${currentResults.length - displayedCount} remaining)
          </button>
        </div>
      `;
    }

    businessContainer.innerHTML = html;

    document.getElementById('btnSeeMore')?.addEventListener('click', () => {
      displayedCount += 5;
      renderResults();
    });
  }

  function createBusinessCardHTML(b) {
    let serviceBadge = '';
    if (b.service_type === 'both' || b.is_online_and_instore) {
      serviceBadge = `<span style="background:#dbeafe; color:#1e40af; font-size:0.75rem; padding:3px 8px; border-radius:12px; font-weight:600; margin-left:6px;">In-Store & Online</span>`;
    } else if (b.service_type === 'delivery' || b.service_type === 'online') {
      serviceBadge = `<span style="background:#dcfce7; color:#166534; font-size:0.75rem; padding:3px 8px; border-radius:12px; font-weight:600; margin-left:6px;">Online / Delivery Available</span>`;
    }

    let featuredBadge = b.is_featured ? `<span style="background:#fef3c7; color:#92400e; font-size:0.75rem; padding:3px 8px; border-radius:12px; font-weight:600;">Featured</span>` : '';

    return `
      <div class="business-card" style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin-bottom:16px; position:relative;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
          <h3 style="margin:0; font-size:1.1rem; font-weight:700; color:#0f172a;">${b.name || 'Business'}</h3>
          <div>${featuredBadge} ${serviceBadge}</div>
        </div>
        <p style="color:#64748b; font-size:0.85rem; margin:4px 0 12px 0;">
          📍 ${b.city || 'Location unavailable'}, ${b.country || 'UK'}
        </p>
        <p style="color:#334155; font-size:0.9rem; line-height:1.4; margin-bottom:12px;">
          ${(b.description || '').substring(0, 110)}...
        </p>
        <a href="/business/${b.id || b.slug}" style="display:inline-block; background:#10b981; color:#fff; text-decoration:none; padding:8px 16px; border-radius:6px; font-size:0.85rem; font-weight:600;">
          View Profile & Contact
        </a>
      </div>
    `;
  }

  // Dynamic City Autocomplete
  if (locationInput && cityDropdown) {
    locationInput.addEventListener('input', function () {
      const q = this.value.trim();
      if (q.length < 1) {
        cityDropdown.classList.add('hidden');
        return;
      }

      fetch(`/api/cities?q=${encodeURIComponent(q)}`)
        .then(res => res.json())
        .then(data => {
          if (!data.cities || data.cities.length === 0) {
            cityDropdown.classList.add('hidden');
            return;
          }

          cityDropdown.innerHTML = data.cities.map(c => `<div class="city-item" style="padding:10px 14px; cursor:pointer; border-bottom:1px solid #f1f5f9;">${c}</div>`).join('');
          cityDropdown.classList.remove('hidden');

          cityDropdown.querySelectorAll('.city-item').forEach(item => {
            item.addEventListener('click', function () {
              locationInput.value = this.textContent;
              cityDropdown.classList.add('hidden');
              fetchSearchResults();
            });
          });
        });
    });
  }

  // Auto Search triggers
  radiusSelect?.addEventListener('change', () => fetchSearchResults());
  searchInput?.addEventListener('change', () => fetchSearchResults());
});
