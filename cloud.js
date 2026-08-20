lucide.createIcons();

// ---------- STATE ----------
const state = {
  theme: localStorage.getItem('cloud_theme') || 'light',
  unit: localStorage.getItem('cloud_unit') || 'c',
  autoLoc: localStorage.getItem('cloud_autoloc') !== 'false',
  place: JSON.parse(localStorage.getItem('cloud_place') || 'null'),
  weather: null,
};

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ---------- THEME ----------
function applyTheme() {
  document.documentElement.classList.toggle('dark', state.theme === 'dark');
  const icon = document.getElementById('icon-theme');
  icon.setAttribute('data-lucide', state.theme === 'dark' ? 'moon' : 'sun-medium');
  lucide.createIcons();
  const toggle = document.getElementById('toggle-dark');
  toggle.classList.toggle('bg-storm-500', state.theme === 'dark');
  toggle.setAttribute('aria-checked', state.theme === 'dark');
  toggle.querySelector('.toggle-thumb').style.transform =
    state.theme === 'dark' ? 'translateX(20px)' : 'translateX(0)';
}
document.getElementById('btn-theme-toggle').addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('cloud_theme', state.theme);
  applyTheme();
});
document.getElementById('toggle-dark').addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('cloud_theme', state.theme);
  applyTheme();
});

// ---------- UNIT ----------
function applyUnitButtons() {
  const cBtn = document.getElementById('unit-c');
  const fBtn = document.getElementById('unit-f');
  const active = 'bg-storm-500 text-white';
  const inactive = 'text-[#667085] dark:text-[#94A3B8]';
  cBtn.className = 'h-10 rounded-full text-sm font-semibold transition ' + (state.unit === 'c' ? active : inactive);
  fBtn.className = 'h-10 rounded-full text-sm font-semibold transition ' + (state.unit === 'f' ? active : inactive);
}
document.getElementById('unit-c').addEventListener('click', () => { state.unit = 'c'; localStorage.setItem('cloud_unit','c'); applyUnitButtons(); renderWeather(); });
document.getElementById('unit-f').addEventListener('click', () => { state.unit = 'f'; localStorage.setItem('cloud_unit','f'); applyUnitButtons(); renderWeather(); });

// ---------- AUTO LOCATION TOGGLE ----------
function applyAutoLocToggle() {
  const t = document.getElementById('toggle-autoloc');
  t.classList.toggle('bg-storm-500', state.autoLoc);
  t.setAttribute('aria-checked', state.autoLoc);
  t.querySelector('.toggle-thumb').style.transform = state.autoLoc ? 'translateX(20px)' : 'translateX(0)';
}
document.getElementById('toggle-autoloc').addEventListener('click', () => {
  state.autoLoc = !state.autoLoc;
  localStorage.setItem('cloud_autoloc', state.autoLoc);
  applyAutoLocToggle();
});

// ---------- NAVIGATION ----------
document.getElementById('btn-open-settings').addEventListener('click', () => showScreen('screen-settings'));
document.getElementById('btn-back-settings').addEventListener('click', () => showScreen('screen-home'));

// ---------- GREETING ----------
function setGreeting() {
  const h = new Date().getHours();
  let g = 'Selamat Malam';
  if (h >= 4 && h < 11) g = 'Selamat Pagi';
  else if (h >= 11 && h < 15) g = 'Selamat Siang';
  else if (h >= 15 && h < 18) g = 'Selamat Sore';
  document.getElementById('greeting-text').textContent = g;
}

// ---------- WEATHER CODE MAPPING ----------
function weatherInfo(code) {
  const map = {
    0: ['Cerah', 'sun'],
    1: ['Cerah Berawan', 'cloud-sun'],
    2: ['Berawan Sebagian', 'cloud-sun'],
    3: ['Berawan', 'cloud'],
    45: ['Berkabut', 'cloud-fog'],
    48: ['Berkabut', 'cloud-fog'],
    51: ['Gerimis Ringan', 'cloud-drizzle'],
    53: ['Gerimis', 'cloud-drizzle'],
    55: ['Gerimis Lebat', 'cloud-drizzle'],
    61: ['Hujan Ringan', 'cloud-rain'],
    63: ['Hujan', 'cloud-rain'],
    65: ['Hujan Lebat', 'cloud-rain'],
    71: ['Salju Ringan', 'cloud-snow'],
    73: ['Salju', 'cloud-snow'],
    75: ['Salju Lebat', 'cloud-snow'],
    80: ['Hujan Sebentar', 'cloud-rain-wind'],
    81: ['Hujan Sebentar', 'cloud-rain-wind'],
    82: ['Hujan Deras', 'cloud-rain-wind'],
    95: ['Badai Petir', 'cloud-lightning'],
    96: ['Badai Petir', 'cloud-lightning'],
    99: ['Badai Petir', 'cloud-lightning'],
  };
  return map[code] || ['Tidak Diketahui', 'cloud'];
}

function toDisplayTemp(celsius) {
  if (state.unit === 'f') return Math.round(celsius * 9/5 + 32) + '°F';
  return Math.round(celsius) + '°C';
}

// ---------- REVERSE GEOCODING: koordinat -> nama kota ----------
// Sumber utama: BigDataCloud (gratis, tanpa API key, akurat untuk nama kota/kabupaten)
// Fallback: Open-Meteo geocoding reverse, jika sumber utama gagal.
async function coordsToCityName(lat, lon) {
  try {
    const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`);
    const d = await r.json();
    const name = d.city || d.locality || d.principalSubdivision || d.countryName;
    if (name) return name;
  } catch (e) { /* lanjut ke fallback */ }

  try {
    const r2 = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=&latitude=${lat}&longitude=${lon}&count=1&language=id&format=json`);
    const d2 = await r2.json();
    if (d2.results && d2.results[0]) return d2.results[0].name;
  } catch (e) { /* lanjut ke fallback terakhir */ }

  return 'Lokasi Saat Ini';
}

// ---------- FETCH WEATHER ----------
async function fetchWeather(lat, lon, label) {
  document.getElementById('main-condition').textContent = 'Memuat...';
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto&forecast_days=6`;
    const res = await fetch(url);
    const data = await res.json();
    state.weather = data;
    state.place = { lat, lon, label };
    localStorage.setItem('cloud_place', JSON.stringify(state.place));
    renderWeather();
    showScreen('screen-home');
  } catch (e) {
    document.getElementById('location-status').textContent = 'Gagal memuat cuaca. Coba lagi.';
  }
}

function renderWeather() {
  const w = state.weather;
  if (!w) return;
  document.getElementById('home-location').querySelector('span').textContent = state.place.label;
  const [condText, iconName] = weatherInfo(w.current.weather_code);
  document.getElementById('main-temp').textContent = toDisplayTemp(w.current.temperature_2m);
  document.getElementById('main-condition').textContent = condText;
  document.getElementById('main-icon').setAttribute('data-lucide', iconName);
  document.getElementById('stat-humidity').textContent = Math.round(w.current.relative_humidity_2m) + '%';
  document.getElementById('stat-feelslike').textContent = toDisplayTemp(w.current.apparent_temperature);
  document.getElementById('stat-wind').textContent = Math.round(w.current.wind_speed_10m) + ' km/j';

  const sunrise = new Date(w.daily.sunrise[0]);
  const sunset = new Date(w.daily.sunset[0]);
  document.getElementById('sun-rise').textContent = sunrise.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
  document.getElementById('sun-set').textContent = sunset.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});

  document.getElementById('summary-uv').textContent = Math.round(w.daily.uv_index_max[0]);
  document.getElementById('summary-humidity').textContent = Math.round(w.current.relative_humidity_2m) + '%';
  document.getElementById('summary-hilo').textContent = toDisplayTemp(w.daily.temperature_2m_max[0]) + ' / ' + toDisplayTemp(w.daily.temperature_2m_min[0]);

  const list = document.getElementById('forecast-list');
  list.innerHTML = '';
  const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  for (let i = 1; i <= 5; i++) {
    const d = new Date(w.daily.time[i]);
    const [ , icon] = weatherInfo(w.daily.weather_code[i]);
    const card = document.createElement('div');
    card.className = 'flex-shrink-0 w-20 rounded-2xl bg-white dark:bg-navy-800 border border-storm-100 dark:border-navy-700 p-3 flex flex-col items-center';
    card.innerHTML = `
      <p class="text-xs text-[#667085] dark:text-[#94A3B8] mb-1">${days[d.getDay()]}</p>
      <i data-lucide="${icon}" class="w-6 h-6 text-storm-500 dark:text-storm-300 my-1.5" aria-hidden="true"></i>
      <p class="text-sm font-semibold">${toDisplayTemp(w.daily.temperature_2m_max[i])}</p>
      <p class="text-xs text-[#98A2B3]">${toDisplayTemp(w.daily.temperature_2m_min[i])}</p>
    `;
    list.appendChild(card);
  }
  lucide.createIcons();
}

// ---------- LOCATION SCREEN ACTIONS ----------
document.getElementById('btn-auto-locate').addEventListener('click', () => {
  const status = document.getElementById('location-status');
  if (!navigator.geolocation) {
    status.textContent = 'Geolocation tidak didukung perangkat ini.';
    return;
  }
  status.textContent = 'Mencari lokasimu...';
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      status.textContent = 'Mengenali nama kota...';
      const label = await coordsToCityName(latitude, longitude);
      fetchWeather(latitude, longitude, label);
    },
    () => { status.textContent = 'Izin lokasi ditolak. Coba cari manual.'; },
  );
});

async function searchCity(query) {
  const box = document.getElementById('search-results');
  if (!query || query.length < 2) { box.classList.add('hidden'); box.innerHTML = ''; return; }
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=id&format=json`);
    const d = await r.json();
    box.innerHTML = '';
    if (!d.results || d.results.length === 0) {
      box.classList.add('hidden');
      return;
    }
    d.results.forEach(place => {
      const item = document.createElement('button');
      item.setAttribute('role', 'option');
      item.className = 'w-full text-left px-5 py-3 hover:bg-storm-50 dark:hover:bg-navy-700 border-b border-storm-50 dark:border-navy-700 last:border-none flex items-center gap-2';
      const region = [place.admin1, place.country].filter(Boolean).join(', ');
      item.innerHTML = `<i data-lucide="map-pin" class="w-4 h-4 text-storm-400 flex-shrink-0" aria-hidden="true"></i><span class="min-w-0 truncate-safe"><span class="font-medium">${place.name}</span><span class="text-xs text-[#98A2B3] block truncate-safe">${region}</span></span>`;
      item.addEventListener('click', () => {
        box.classList.add('hidden');
        document.getElementById('input-city').value = '';
        fetchWeather(place.latitude, place.longitude, place.name);
      });
      box.appendChild(item);
    });
    lucide.createIcons();
    box.classList.remove('hidden');
  } catch (e) { /* biarkan hasil kosong jika request gagal */ }
}
let searchTimeout;
document.getElementById('input-city').addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => searchCity(e.target.value), 350);
});
document.getElementById('btn-manual-search').addEventListener('click', () => {
  searchCity(document.getElementById('input-city').value);
});

// ---------- INIT ----------
applyTheme();
applyUnitButtons();
applyAutoLocToggle();
setGreeting();

setTimeout(() => {
  if (state.autoLoc && state.place) {
    fetchWeather(state.place.lat, state.place.lon, state.place.label);
  } else {
    showScreen('screen-location');
  }
}, 1400);
