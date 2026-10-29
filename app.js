/* =============================================
   AutoVault — app.js
   Main application logic: fetch, filter, render
   ============================================= */

const API_URL = 'https://api-web.dnccudinus.org/api/mobil';

// ─── State ───────────────────────────────────
const state = {
  cars: [],
  filtered: [],
  searchQuery: '',
  filters: { brand: '', transmisi: '', bahanBakar: '', status: '', sort: '' },
};

// ─── DOM Refs ─────────────────────────────────
const $carGrid      = document.getElementById('carGrid');
const $skeletonGrid = document.getElementById('skeletonGrid');
const $emptyState   = document.getElementById('emptyState');
const $errorState   = document.getElementById('errorState');
const $resultInfo   = document.getElementById('resultInfo');
const $searchInput  = document.getElementById('searchInput');
const $searchClear  = document.getElementById('searchClear');
const $filterBrand  = document.getElementById('filterBrand');
const $filterTrans  = document.getElementById('filterTransmisi');
const $filterFuel   = document.getElementById('filterBahanBakar');
const $filterStatus = document.getElementById('filterStatus');
const $filterSort   = document.getElementById('filterSort');
const $resetBtn     = document.getElementById('resetFilters');
const $retryBtn     = document.getElementById('retryBtn');
const $modalOverlay = document.getElementById('modalOverlay');
const $modalClose   = document.getElementById('modalClose');
const $themeToggle  = document.getElementById('themeToggle');
const $navbar       = document.getElementById('navbar');

// ─── Theme ────────────────────────────────────
const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('autovault-theme', theme);
};

const initTheme = () => {
  const saved = localStorage.getItem('autovault-theme') || 'dark';
  applyTheme(saved);
};

$themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// ─── Navbar scroll ────────────────────────────
window.addEventListener('scroll', () => {
  $navbar.classList.toggle('scrolled', window.scrollY > 30);
});

// ─── Utilities ────────────────────────────────
const formatRupiah = (num) =>
  'Rp ' + new Intl.NumberFormat('id-ID').format(num);

const fuelClass = (fuel) => {
  const map = { Listrik: 'fuel-listrik', Hybrid: 'fuel-hybrid', Diesel: 'fuel-diesel' };
  return map[fuel] || '';
};

const fuelIcon = (fuel) => {
  const map = { Listrik: '⚡', Hybrid: '🔋', Diesel: '🛢', Bensin: '⛽' };
  return map[fuel] || '⛽';
};

const transIcon = (trans) => {
  const map = { Manual: '🕹', Matic: '⚙', CVT: '🔄' };
  return map[trans] || '⚙';
};

// ─── Scroll Reveal ────────────────────────────
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 80);
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 }
);

const observeReveal = () => {
  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));
};

// ─── Populate Brand Filter ────────────────────
const populateBrandFilter = (cars) => {
  const brands = [...new Set(cars.map((c) => c.brand))].sort();
  brands.forEach((brand) => {
    const opt = document.createElement('option');
    opt.value = brand;
    opt.textContent = brand;
    $filterBrand.appendChild(opt);
  });
};

// ─── Update Stats ─────────────────────────────
const updateStats = (cars) => {
  document.getElementById('statTotal').textContent     = cars.length;
  document.getElementById('statAvailable').textContent = cars.filter((c) => c.status === 'tersedia').length;
  document.getElementById('statBrands').textContent    = new Set(cars.map((c) => c.brand)).size;
  document.getElementById('statElectric').textContent  = cars.filter((c) => c.bahan_bakar === 'Listrik').length;
};

// ─── Apply Filters ────────────────────────────
const applyFilters = () => {
  const q = state.searchQuery.toLowerCase();
  let result = state.cars.filter((car) => {
    const matchSearch = !q || car.nama.toLowerCase().includes(q) || car.brand.toLowerCase().includes(q);
    const matchBrand  = !state.filters.brand       || car.brand === state.filters.brand;
    const matchTrans  = !state.filters.transmisi   || car.transmisi === state.filters.transmisi;
    const matchFuel   = !state.filters.bahanBakar  || car.bahan_bakar === state.filters.bahanBakar;
    const matchStatus = !state.filters.status      || car.status === state.filters.status;
    return matchSearch && matchBrand && matchTrans && matchFuel && matchStatus;
  });

  const sortMap = {
    'harga-asc':   (a, b) => a.harga - b.harga,
    'harga-desc':  (a, b) => b.harga - a.harga,
    'tahun-desc':  (a, b) => b.tahun - a.tahun,
    'tahun-asc':   (a, b) => a.tahun - b.tahun,
    'nama-asc':    (a, b) => a.nama.localeCompare(b.nama),
  };

  if (state.filters.sort && sortMap[state.filters.sort]) {
    result.sort(sortMap[state.filters.sort]);
  }

  state.filtered = result;
  renderCards();
};

// ─── Render Cards ─────────────────────────────
const renderCards = () => {
  $carGrid.innerHTML = '';

  if (state.filtered.length === 0) {
    $carGrid.classList.add('hidden');
    $emptyState.classList.remove('hidden');
    $resultInfo.textContent = 'Tidak ada kendaraan ditemukan.';
    return;
  }

  $emptyState.classList.add('hidden');
  $carGrid.classList.remove('hidden');
  $resultInfo.textContent = `Menampilkan ${state.filtered.length} dari ${state.cars.length} kendaraan`;

  const fragment = document.createDocumentFragment();

  state.filtered.forEach((car, idx) => {
    const card = buildCard(car, idx);
    fragment.appendChild(card);
  });

  $carGrid.appendChild(fragment);

  // Animate cards in with stagger
  const cards = $carGrid.querySelectorAll('.car-card');
  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 60);
        cardObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05 });

  cards.forEach((card) => cardObserver.observe(card));
};

// ─── Build Single Card ────────────────────────
const buildCard = (car, idx) => {
  const card = document.createElement('article');
  card.className = 'car-card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `Lihat detail ${car.nama}`);
  card.style.transitionDelay = `${idx * 40}ms`;

  card.innerHTML = `
    <div class="car-img-wrapper">
      <img
        class="car-img"
        src="${car.foto}"
        alt="${car.nama}"
        loading="lazy"
        onerror="this.src='https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80'"
      />
      <div class="car-img-overlay"></div>
      <span class="car-year-badge">${car.tahun}</span>
      <span class="car-status ${car.status}">${car.status === 'tersedia' ? '✓ Tersedia' : '✗ Sold Out'}</span>
    </div>
    <div class="car-body">
      <p class="car-brand">${car.brand}</p>
      <h3 class="car-name">${car.nama}</h3>
      <div class="car-specs">
        <span class="spec-chip ${fuelClass(car.bahan_bakar)}">${fuelIcon(car.bahan_bakar)} ${car.bahan_bakar}</span>
        <span class="spec-chip">${transIcon(car.transmisi)} ${car.transmisi}</span>
      </div>
      <div class="car-footer">
        <span class="car-price">${formatRupiah(car.harga)}</span>
        <button class="car-detail-btn" aria-label="Detail ${car.nama}">→</button>
      </div>
    </div>
  `;

  card.addEventListener('click', () => openModal(car));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') openModal(car);
  });

  return card;
};

// ─── Modal ────────────────────────────────────
const openModal = (car) => {
  document.getElementById('modalImg').src      = car.foto;
  document.getElementById('modalImg').alt      = car.nama;
  document.getElementById('modalBrand').textContent = car.brand;
  document.getElementById('modalTitle').textContent = car.nama;
  document.getElementById('modalPrice').textContent = formatRupiah(car.harga);

  const $status = document.getElementById('modalStatus');
  $status.textContent = car.status === 'tersedia' ? '✓ Tersedia' : '✗ Sold Out';
  $status.className = `modal-status-badge ${car.status}`;

  document.getElementById('modalSpecs').innerHTML = `
    <div class="modal-spec-item">
      <span class="modal-spec-label">Brand</span>
      <span class="modal-spec-value">${car.brand}</span>
    </div>
    <div class="modal-spec-item">
      <span class="modal-spec-label">Tahun</span>
      <span class="modal-spec-value">${car.tahun}</span>
    </div>
    <div class="modal-spec-item">
      <span class="modal-spec-label">Transmisi</span>
      <span class="modal-spec-value">${transIcon(car.transmisi)} ${car.transmisi}</span>
    </div>
    <div class="modal-spec-item">
      <span class="modal-spec-label">Bahan Bakar</span>
      <span class="modal-spec-value">${fuelIcon(car.bahan_bakar)} ${car.bahan_bakar}</span>
    </div>
    <div class="modal-spec-item">
      <span class="modal-spec-label">Status</span>
      <span class="modal-spec-value">${car.status === 'tersedia' ? '✓ Tersedia' : '✗ Sold Out'}</span>
    </div>
    <div class="modal-spec-item">
      <span class="modal-spec-label">ID Unit</span>
      <span class="modal-spec-value">#${car.id}</span>
    </div>
  `;

  $modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
};

const closeModal = () => {
  $modalOverlay.classList.add('hidden');
  document.body.style.overflow = '';
};

$modalClose.addEventListener('click', closeModal);
$modalOverlay.addEventListener('click', (e) => {
  if (e.target === $modalOverlay) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ─── Event Listeners: Filters ─────────────────
$searchInput.addEventListener('input', (e) => {
  state.searchQuery = e.target.value;
  $searchClear.classList.toggle('visible', state.searchQuery.length > 0);
  applyFilters();
});

$searchClear.addEventListener('click', () => {
  $searchInput.value = '';
  state.searchQuery = '';
  $searchClear.classList.remove('visible');
  applyFilters();
  $searchInput.focus();
});

$filterBrand.addEventListener('change',  (e) => { state.filters.brand      = e.target.value; applyFilters(); });
$filterTrans.addEventListener('change',  (e) => { state.filters.transmisi  = e.target.value; applyFilters(); });
$filterFuel.addEventListener('change',   (e) => { state.filters.bahanBakar = e.target.value; applyFilters(); });
$filterStatus.addEventListener('change', (e) => { state.filters.status     = e.target.value; applyFilters(); });
$filterSort.addEventListener('change',   (e) => { state.filters.sort       = e.target.value; applyFilters(); });

$resetBtn.addEventListener('click', () => {
  state.searchQuery = '';
  state.filters = { brand: '', transmisi: '', bahanBakar: '', status: '', sort: '' };
  $searchInput.value = '';
  $searchClear.classList.remove('visible');
  [$filterBrand, $filterTrans, $filterFuel, $filterStatus, $filterSort].forEach((el) => (el.value = ''));
  applyFilters();
});

// ─── Fetch Data ───────────────────────────────
const fetchCars = async () => {
  try {
    $skeletonGrid.classList.remove('hidden');
    $carGrid.classList.add('hidden');
    $emptyState.classList.add('hidden');
    $errorState.classList.add('hidden');

    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const json = await response.json();
    if (!json.success || !Array.isArray(json.data)) throw new Error('Invalid data format');

    state.cars = json.data;
    state.filtered = [...state.cars];

    $skeletonGrid.classList.add('hidden');

    populateBrandFilter(state.cars);
    updateStats(state.cars);
    applyFilters();
  } catch (err) {
    console.error('Fetch error:', err);
    $skeletonGrid.classList.add('hidden');
    $errorState.classList.remove('hidden');
  }
};

$retryBtn.addEventListener('click', fetchCars);

// ─── Init ─────────────────────────────────────
const init = () => {
  initTheme();
  observeReveal();
  fetchCars();
};

init();
