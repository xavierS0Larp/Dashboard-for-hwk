/**
 * AGRI-TECH MODERN FINTECH DASHBOARD
 * System: ระบบทะเบียนเกษตรกร อ.ห้วยราช จ.บุรีรัมย์ (2565-2567)
 * Style: Fintech Minimalist (Inspired by reference Dribbble design)
 * Strictly 5 Colors:
 * 1. #0C7C59 (Deep Emerald Green)
 * 2. #A7F3D0 (Mint / Soft Sage)
 * 3. #F3F4F6 (Soft Pale Gray / Canvas)
 * 4. #FFFFFF (Pure White)
 * 5. #1E293B (Deep Charcoal Slate)
 */

// Global State
const state = {
  raw: [],
  filtered: [],
  year: 'ALL',
  tambon: 'ALL',
  crop: 'ALL',
  channel: 'ALL',
  chartMode: 'crops', // 'crops' | 'tambons'
  searchQuery: '',
  currentPage: 1,
  pageSize: 8,
  leafletMap: null,
  mapMarkersLayer: null
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  if (window.FARMERS_DATA && Array.isArray(window.FARMERS_DATA)) {
    state.raw = window.FARMERS_DATA;
    initDashboard();
  } else {
    try {
      const res = await fetch('farmers_data.json');
      state.raw = await res.json();
      initDashboard();
    } catch (err) {
      console.error('Failed to load dataset:', err);
      alert('ไม่สามารถโหลดไฟล์ข้อมูลได้');
    }
  }
});

function initDashboard() {
  setupEventListeners();
  initMap();
  applyFilters();
}

// -------------------------------------------------------------
// EVENT LISTENERS
// -------------------------------------------------------------
function setupEventListeners() {
  // Top Year Dropdown
  const yearSelect = document.getElementById('quick-year-select');
  yearSelect.addEventListener('change', (e) => {
    state.year = e.target.value;
    state.currentPage = 1;
    applyFilters();
  });

  // Export CSV Buttons
  document.getElementById('btn-export-top').addEventListener('click', exportToCSV);

  // Chart Toggle Pills (Crops vs Tambons)
  const btnCrops = document.getElementById('btn-toggle-crops');
  const btnTambons = document.getElementById('btn-toggle-tambons');

  btnCrops.addEventListener('click', () => {
    btnCrops.classList.add('active');
    btnTambons.classList.remove('active');
    state.chartMode = 'crops';
    renderCapsuleChart();
  });

  btnTambons.addEventListener('click', () => {
    btnTambons.classList.add('active');
    btnCrops.classList.remove('active');
    state.chartMode = 'tambons';
    renderCapsuleChart();
  });

  // Channel Filter Buttons (Send / Receive style)
  document.getElementById('btn-filter-tbk').addEventListener('click', () => {
    state.channel = state.channel === 'ทบก' ? 'ALL' : 'ทบก';
    applyFilters();
  });

  document.getElementById('btn-filter-farmbook').addEventListener('click', () => {
    state.channel = state.channel === 'FARMBOOK' ? 'ALL' : 'FARMBOOK';
    applyFilters();
  });

  // Tambon Chips
  document.querySelectorAll('#tambon-chips-group .chip-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('#tambon-chips-group .chip-btn').forEach(b => b.classList.remove('active'));
      const target = e.currentTarget;
      target.classList.add('active');
      state.tambon = target.getAttribute('data-tambon');
      state.currentPage = 1;
      applyFilters();
    });
  });

  // Table Search Input
  const searchInput = document.getElementById('table-search');
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim().toLowerCase();
    state.currentPage = 1;
    applyFilters();
  });

  // Pagination
  document.getElementById('btn-page-prev').addEventListener('click', () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      renderTable();
    }
  });

  document.getElementById('btn-page-next').addEventListener('click', () => {
    const totalPages = Math.ceil(state.filtered.length / state.pageSize) || 1;
    if (state.currentPage < totalPages) {
      state.currentPage++;
      renderTable();
    }
  });

  // Reset Map View
  document.getElementById('btn-reset-map').addEventListener('click', () => {
    if (state.leafletMap) {
      state.leafletMap.setView([14.995, 103.250], 12);
    }
  });

  // Modal Close
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('farmer-modal').addEventListener('click', (e) => {
    if (e.target.id === 'farmer-modal') closeModal();
  });

  // Sidebar Icons Navigation
  document.getElementById('nav-btn-chart').addEventListener('click', () => {
    document.getElementById('capsule-bars-wrapper').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('nav-btn-map').addEventListener('click', () => {
    document.getElementById('map').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('nav-btn-table').addEventListener('click', () => {
    document.getElementById('table-search').scrollIntoView({ behavior: 'smooth' });
  });
}

// -------------------------------------------------------------
// FILTERING ENGINE
// -------------------------------------------------------------
function applyFilters() {
  const { year, tambon, crop, channel, searchQuery } = state;

  state.filtered = state.raw.filter(item => {
    if (year !== 'ALL' && item.year !== year) return false;
    if (tambon !== 'ALL' && item.p_tam !== tambon) return false;
    if (crop !== 'ALL' && item.crop !== crop) return false;
    if (channel !== 'ALL' && item.channel !== channel) return false;

    if (searchQuery) {
      const matchName = item.name && item.name.toLowerCase().includes(searchQuery);
      const matchDeed = item.deed_no && item.deed_no.includes(searchQuery);
      const matchVariety = item.variety && item.variety.toLowerCase().includes(searchQuery);
      const matchTambon = item.p_tam && item.p_tam.toLowerCase().includes(searchQuery);
      if (!matchName && !matchDeed && !matchVariety && !matchTambon) return false;
    }

    return true;
  });

  renderHeroCard();
  renderCapsuleChart();
  renderTrendStats();
  updateMapMarkers();
  renderTable();
}

// -------------------------------------------------------------
// HERO GREEN CARD & STATS
// -------------------------------------------------------------
function renderHeroCard() {
  const data = state.filtered;
  const totalPlots = data.length;
  const totalArea = data.reduce((acc, curr) => acc + (curr.area || 0), 0);
  const uniqueFarmers = new Set(data.map(d => d.name)).size;
  const passedPlots = data.filter(d => d.status === 'ผ่าน').length;
  const passRate = totalPlots > 0 ? ((passedPlots / totalPlots) * 100).toFixed(1) : 0;

  // Hero Card Elements
  document.getElementById('hero-area-val').innerHTML = 
    `${totalArea.toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span style="font-size: 16px; font-weight: 700;">ไร่</span>`;
  document.getElementById('hero-farmers-count').textContent = `•••• ${uniqueFarmers.toLocaleString('th-TH')} เกษตรกร`;
  
  // Subcard
  document.getElementById('sub-passed-count').textContent = `${passedPlots.toLocaleString('th-TH')} แปลง`;
  document.getElementById('sub-passed-pct').textContent = `+${passRate}%`;
}

// -------------------------------------------------------------
// CAPSULE PILL BARS CHART (Engagement Rate style)
// -------------------------------------------------------------
function renderCapsuleChart() {
  const container = document.getElementById('capsule-bars-wrapper');
  container.innerHTML = '';

  const data = state.filtered;
  let items = [];

  if (state.chartMode === 'crops') {
    // Top Crops
    const agg = {};
    data.forEach(d => {
      const c = d.crop || 'อื่นๆ';
      agg[c] = (agg[c] || 0) + (d.area || 0);
    });

    items = Object.keys(agg).map(name => ({
      label: name,
      val: agg[name]
    })).sort((a, b) => b.val - a.val);

  } else {
    // Top Tambons
    const agg = {};
    data.forEach(d => {
      const t = d.p_tam || 'อื่นๆ';
      agg[t] = (agg[t] || 0) + (d.area || 0);
    });

    items = Object.keys(agg).map(name => ({
      label: name,
      val: agg[name]
    })).sort((a, b) => b.val - a.val);
  }

  // Take top 5 items
  const displayItems = items.slice(0, 5);
  const maxVal = displayItems.length > 0 ? displayItems[0].val : 1;
  const totalVal = displayItems.reduce((acc, c) => acc + c.val, 0) || 1;

  displayItems.forEach((item, index) => {
    const isPeak = index === 0;
    const heightPct = Math.max(15, Math.round((item.val / maxVal) * 150));
    const pctOfTotal = ((item.val / totalVal) * 100).toFixed(1);

    const col = document.createElement('div');
    col.className = 'capsule-bar-col';

    // Short label for display
    let shortLabel = item.label;
    if (shortLabel === 'มันสำปะหลัง') shortLabel = 'มันสำปะฯ';
    if (shortLabel === 'อ้อยโรงงาน') shortLabel = 'อ้อย';

    col.innerHTML = `
      ${isPeak ? `<div class="capsule-floating-badge">+${pctOfTotal}%</div>` : ''}
      <div class="capsule-bar ${isPeak ? 'peak' : 'pattern'}" style="height: ${heightPct}px;" title="${item.label}: ${item.val.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ไร่"></div>
      <span class="capsule-bar-label">${shortLabel}</span>
    `;

    // Click bar to filter
    col.addEventListener('click', () => {
      if (state.chartMode === 'crops') {
        state.crop = state.crop === item.label ? 'ALL' : item.label;
      } else {
        state.tambon = state.tambon === item.label ? 'ALL' : item.label;
        document.querySelectorAll('#tambon-chips-group .chip-btn').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-tambon') === state.tambon);
        });
      }
      applyFilters();
    });

    container.appendChild(col);
  });

  if (displayItems.length === 0) {
    container.innerHTML = '<div style="margin: auto; font-size: 13px; font-weight: 700; color: rgba(30, 41, 59, 0.65);">ไม่มีข้อมูลตามเงื่อนไขที่เลือก</div>';
  }
}

// -------------------------------------------------------------
// TREND STATS & CHANNEL BUTTONS
// -------------------------------------------------------------
function renderTrendStats() {
  const data = state.filtered;
  const year2567 = data.filter(d => d.year === '2567').length;
  document.getElementById('trend-year-count').textContent = `${(state.year === 'ALL' ? year2567 : data.length).toLocaleString('th-TH')} แปลง`;
  document.getElementById('trend-year-growth').textContent = state.year === 'ALL' ? '+4.7% (2567)' : `ปี ${state.year}`;

  // Update button active state
  const btnTbk = document.getElementById('btn-filter-tbk');
  const btnFb = document.getElementById('btn-filter-farmbook');

  if (state.channel === 'ทบก') {
    btnTbk.style.opacity = '1';
    btnFb.style.opacity = '0.5';
  } else if (state.channel === 'FARMBOOK') {
    btnTbk.style.opacity = '0.5';
    btnFb.style.opacity = '1';
  } else {
    btnTbk.style.opacity = '1';
    btnFb.style.opacity = '1';
  }
}

// -------------------------------------------------------------
// INTERACTIVE GIS MAP (Leaflet Soft Minimalist)
// -------------------------------------------------------------
function initMap() {
  if (typeof L === 'undefined') return;

  state.leafletMap = L.map('map', {
    center: [14.995, 103.250],
    zoom: 12,
    zoomControl: false
  });

  // Soft Voyager / Light Tiles
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(state.leafletMap);

  state.mapMarkersLayer = L.layerGroup().addTo(state.leafletMap);
}

function updateMapMarkers() {
  if (!state.leafletMap || !state.mapMarkersLayer) return;

  state.mapMarkersLayer.clearLayers();
  const data = state.filtered;

  const maxRender = 1200;
  const step = data.length > maxRender ? Math.ceil(data.length / maxRender) : 1;

  for (let i = 0; i < data.length; i += step) {
    const item = data[i];
    if (item.lat && item.lng) {
      // Emerald Green Circle Marker
      const marker = L.circleMarker([item.lat, item.lng], {
        radius: 4.5,
        fillColor: '#0C7C59',
        color: '#FFFFFF',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.85
      });

      const popupHtml = `
        <div style="font-family: sans-serif; font-size: 12px; color: #1E293B; min-width: 190px;">
          <div style="font-weight: 800; font-size: 14px; margin-bottom: 4px; color: #0C7C59;">
            ${item.name}
          </div>
          <div style="color: rgba(30, 41, 59, 0.65);">หมู่ ${item.p_moo || '-'} ต.${item.p_tam} อ.ห้วยราช</div>
          <div style="margin-top: 4px;"><b>พืช:</b> ${item.crop} (${item.variety || '-'})</div>
          <div><b>เนื้อที่:</b> ${item.area} ไร่ (${item.doc_type})</div>
          <div style="margin-top: 6px;">
            <span class="status-dot-pill ${item.status === 'ผ่าน' ? 'success' : 'pending'}">${item.status}</span>
            <span style="font-size: 11px; font-weight: 700; color: rgba(30, 41, 59, 0.65); margin-left: 6px;">ปี ${item.year}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      state.mapMarkersLayer.addLayer(marker);
    }
  }
}

// -------------------------------------------------------------
// FINTECH DATA TABLE
// -------------------------------------------------------------
function renderTable() {
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  const data = state.filtered;
  const total = data.length;
  const totalPages = Math.ceil(total / state.pageSize) || 1;

  if (state.currentPage > totalPages) state.currentPage = totalPages;
  if (state.currentPage < 1) state.currentPage = 1;

  const startIdx = (state.currentPage - 1) * state.pageSize;
  const endIdx = Math.min(startIdx + state.pageSize, total);
  const pageData = data.slice(startIdx, endIdx);

  if (pageData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: rgba(30, 41, 59, 0.65); font-weight: 700;">ไม่พบข้อมูลแปลงเกษตรกร</td></tr>`;
  } else {
    pageData.forEach(item => {
      const tr = document.createElement('tr');
      const isPass = item.status === 'ผ่าน';

      tr.innerHTML = `
        <td>
          <div class="table-farmer-cell">
            <div class="table-farmer-icon">🌾</div>
            <div>
              <a href="#" class="farmer-name-click" data-name="${encodeURIComponent(item.name)}" style="font-weight: 800; color: #1E293B; text-decoration: none;">
                ${item.name}
              </a>
              <div style="font-size: 11px; color: rgba(30, 41, 59, 0.65);">${item.doc_type} #${item.deed_no || '-'}</div>
            </div>
          </div>
        </td>
        <td>ต.${item.p_tam}</td>
        <td><b>${item.crop}</b></td>
        <td>
          <span class="status-dot-pill ${isPass ? 'success' : 'pending'}">
            ● ${item.status}
          </span>
        </td>
        <td style="text-align: right; font-weight: 800;">${item.area.toFixed(2)} ไร่</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Pagination UI
  document.getElementById('pagination-info').textContent = 
    `แสดง ${startIdx + 1} - ${endIdx} จาก ${total.toLocaleString('th-TH')} แปลง`;
  document.getElementById('page-display').textContent = `${state.currentPage} / ${totalPages}`;
  document.getElementById('btn-page-prev').disabled = state.currentPage === 1;
  document.getElementById('btn-page-next').disabled = state.currentPage === totalPages;

  // Bind Farmer Profile Click
  document.querySelectorAll('.farmer-name-click').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const farmerName = decodeURIComponent(e.currentTarget.getAttribute('data-name'));
      openFarmerModal(farmerName);
    });
  });
}

// -------------------------------------------------------------
// FARMER PROFILE MODAL
// -------------------------------------------------------------
function openFarmerModal(farmerName) {
  const plots = state.raw.filter(d => d.name === farmerName);
  if (plots.length === 0) return;

  const first = plots[0];
  document.getElementById('modal-farmer-name').textContent = farmerName;
  document.getElementById('modal-farmer-address').textContent = 
    `ที่อยู่: หมู่ ${first.h_moo || '-'} ตำบล${first.h_tam} อำเภอ${first.p_tam ? 'ห้วยราช' : '-'} จ.บุรีรัมย์`;

  document.getElementById('modal-total-plots').textContent = `${plots.length} แปลง`;
  const totalArea = plots.reduce((acc, p) => acc + (p.area || 0), 0);
  document.getElementById('modal-total-area').textContent = `${totalArea.toFixed(2)} ไร่`;
  
  const latestStatus = plots[plots.length - 1].status;
  document.getElementById('modal-latest-status').innerHTML = 
    `<span class="status-dot-pill ${latestStatus === 'ผ่าน' ? 'success' : 'pending'}">● ${latestStatus}</span>`;

  const tbody = document.getElementById('modal-plots-tbody');
  tbody.innerHTML = plots.map(p => `
    <tr>
      <td style="font-weight: 800; color: #0C7C59;">ปี ${p.year}</td>
      <td>ม.${p.p_moo || '-'} ต.${p.p_tam}</td>
      <td><b>${p.crop}</b> (${p.variety || '-'})</td>
      <td>${p.doc_type} #${p.deed_no || '-'}</td>
      <td style="text-align: right; font-weight: 800;">${p.area.toFixed(2)} ไร่</td>
    </tr>
  `).join('');

  document.getElementById('farmer-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('farmer-modal').classList.remove('open');
}

// -------------------------------------------------------------
// EXPORT TO CSV
// -------------------------------------------------------------
function exportToCSV() {
  const data = state.filtered;
  if (data.length === 0) {
    alert('ไม่มีข้อมูลให้ส่งออก');
    return;
  }

  const headers = [
    'ACTIVITY_ID', 'ชื่อ-นามสกุล', 'ตำบลแปลง', 'หมู่แปลง', 
    'พืช', 'สายพันธุ์', 'เนื้อที่_ไร่', 'เอกสารสิทธิ์', 'เลขที่เอกสาร', 
    'สถานะประชาคม', 'ช่องทาง', 'ปีทะเบียน', 'ละติจูด', 'ลองจิจูด'
  ];

  const rows = data.map(d => [
    `"${d.id || ''}"`,
    `"${d.name || ''}"`,
    `"${d.p_tam || ''}"`,
    `"${d.p_moo || ''}"`,
    `"${d.crop || ''}"`,
    `"${d.variety || ''}"`,
    d.area || 0,
    `"${d.doc_type || ''}"`,
    `"${d.deed_no || ''}"`,
    `"${d.status || ''}"`,
    `"${d.channel || ''}"`,
    d.year || '',
    d.lat || '',
    d.lng || ''
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `รายงานเกษตรกร_ห้วยราช_${state.year}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
