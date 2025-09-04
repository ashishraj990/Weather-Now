// ====== CONFIG ======
const API_KEY = "42820d8ad30a4aa587375139250309"; 
const BASE = "https://api.weatherapi.com/v1/forecast.json"; 
const DAYS = 7;

// ====== ELEMENTS ======
const placeEl = document.getElementById("place");
const localtimeEl = document.getElementById("localtime");
const tempEl = document.getElementById("temp");
const condEl = document.getElementById("cond");
const curIconEl = document.getElementById("curIcon");
const feelsEl = document.getElementById("feelslike");
const aqiEl = document.getElementById("aqi");

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");
const locBtn = document.getElementById("locBtn");

const hourlyScroll = document.getElementById("hourlyScroll");
const dailyList = document.getElementById("dailyList");

const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const precipEl = document.getElementById("precip");
const uvEl = document.getElementById("uv");
const visEl = document.getElementById("vis");
const pressureEl = document.getElementById("pressure");

const sunriseEl = document.getElementById("sunrise");
const sunsetEl = document.getElementById("sunset");

const tipsList = document.getElementById("tipsList");

// ====== HELPERS ======
function formatTimeLocal(dtStr) {
  // input like "2025-09-03 18:00"
  if (!dtStr) return "";
  const d = new Date(dtStr.replace(" ", "T"));
  // show HH:MM (locale)
  return d.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
}
function shortDay(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString([], {weekday: "short"});
}
function setError(msg) {
  // quick user-visible alert (could be replaced)
  alert(msg);
}

// ====== RENDER ======
function renderCurrent(data) {
  const loc = data.location;
  const cur = data.current;

  placeEl.textContent = `${loc.name}${loc.region ? ", " + loc.region : ""}`;
  localtimeEl.textContent = loc.localtime;
  tempEl.textContent = `${Math.round(cur.temp_c)}°`;
  condEl.textContent = cur.condition.text;
  curIconEl.src = cur.condition.icon.startsWith("//") ? "https:" + cur.condition.icon : cur.condition.icon;
  curIconEl.alt = cur.condition.text;

  feelsEl.textContent = `Feels: ${Math.round(cur.feelslike_c)}°C`;

  // AQI (if present)
  const aqi = cur.air_quality ? cur.air_quality.pm2_5 : null;
  if (aqi != null) {
    aqiEl.textContent = `AQI: ${Math.round(aqi)}`;
  } else {
    aqiEl.textContent = `AQI: —`;
  }

  // details
  humidityEl.textContent = `${cur.humidity}%`;
  windEl.textContent = `${Math.round(cur.wind_kph)} kph`;
  precipEl.textContent = `${cur.precip_mm} mm`;
  uvEl.textContent = cur.uv ?? "—";
  visEl.textContent = `${cur.vis_km} km`;
  pressureEl.textContent = `${cur.pressure_mb} mb`;
}

function renderHourly(forecast) {
  // forecast is forecast.forecastday[0].hour...
  hourlyScroll.innerHTML = "";
  // We'll show next 12 hours starting from current localtime
  const allHours = [];
  forecast.forecastday.forEach(fd => {
    fd.hour.forEach(h => allHours.push(h));
  });

  // deduce current index by matching time epoch to closest
  const nowTs = Date.now();
  // create 24 items from now forward
  const next = allHours.filter(h => new Date(h.time.replace(" ", "T")).getTime() >= nowTs).slice(0, 24);

  // fallback: if none (edge), use first day's hours
  const display = next.length ? next : forecast.forecastday[0].hour.slice(0, 12);

  display.forEach(h => {
    const el = document.createElement("div");
    el.className = "hour-item";
    const t = formatTimeLocal(h.time);
    el.innerHTML = `
      <div class="h-time">${t}</div>
      <img src="${h.condition.icon.startsWith("//") ? "https:" + h.condition.icon : h.condition.icon}" alt="${h.condition.text}" />
      <div class="h-temp">${Math.round(h.temp_c)}°</div>
      <div class="h-precip" style="font-size:12px;color:rgba(230,238,246,0.7)">${h.chance_of_rain ?? h.chance_of_snow ?? 0}%</div>
    `;
    hourlyScroll.appendChild(el);
  });
}

function renderDaily(forecast) {
  dailyList.innerHTML = "";
  forecast.forecastday.forEach(fd => {
    const el = document.createElement("div");
    el.className = "day-row";
    const dayLabel = shortDay(fd.date);
    const icon = fd.day.condition.icon.startsWith("//") ? "https:" + fd.day.condition.icon : fd.day.condition.icon;
    el.innerHTML = `
      <div class="day-left">
        <div>
          <div class="day-name">${dayLabel}</div>
          <div class="day-sub" style="font-size:12px;color:rgba(230,238,246,0.7)">${fd.date}</div>
        </div>
        <img src="${icon}" alt="${fd.day.condition.text}" />
      </div>
      <div class="day-right">
        <div class="day-temp">${Math.round(fd.day.maxtemp_c)}° / ${Math.round(fd.day.mintemp_c)}°</div>
        <div style="font-size:12px;color:rgba(230,238,246,0.75)">${fd.day.condition.text}</div>
      </div>
    `;
    dailyList.appendChild(el);
  });
}

function renderSun(forecast) {
  // use today's astro
  const astro = forecast.forecastday[0].astro;
  sunriseEl.textContent = astro.sunrise || "—";
  sunsetEl.textContent = astro.sunset || "—";
}

function renderTips(data) {
  // add some simple lifestyle tips based on current values
  const cur = data.current;
  tipsList.innerHTML = "";
  const tips = [];

  if (cur.temp_c >= 30) tips.push("It's hot — stay hydrated");
  if (cur.temp_c <= 5) tips.push("Cold — wear warm clothes");
  if (cur.uv >= 6) tips.push("High UV — wear sunscreen");
  if (cur.humidity >= 80) tips.push("High humidity — might feel muggy");
  if ((cur.air_quality && cur.air_quality.pm2_5) > 100) tips.push("Poor air quality — avoid outdoor exertion");

  if (tips.length === 0) tips.push("Conditions look normal — have a great day!");

  tips.forEach(t => {
    const el = document.createElement("div");
    el.className = "tip";
    el.textContent = t;
    tipsList.appendChild(el);
  });
}

// ====== FETCH & FLOW ======
async function fetchWeatherByQuery(q) {
  try {
    const url = `${BASE}?key=${API_KEY}&q=${encodeURIComponent(q)}&days=${DAYS}&aqi=yes&alerts=no`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Location not found");
    const data = await res.json();
    renderAll(data);
  } catch (err) {
    setError(err.message || "Failed to fetch");
  }
}

async function fetchWeatherByCoords(lat, lon) {
  return fetchWeatherByQuery(`${lat},${lon}`);
}

function renderAll(data) {
  renderCurrent(data);
  renderHourly(data.forecast ? data.forecast : { forecastday: [] });
  renderDaily(data.forecast ? data.forecast : { forecastday: [] });
  renderSun(data.forecast ? data.forecast : { forecastday: [] });
  renderTips(data);
}

// ====== EVENTS ======
searchForm.addEventListener("submit", e => {
  e.preventDefault();
  const q = searchInput.value.trim();
  if (!q) return;
  fetchWeatherByQuery(q);
});

refreshBtn.addEventListener("click", () => {
  // re-run using current place text
  const q = placeEl.textContent && placeEl.textContent !== "—" ? placeEl.textContent.split(",")[0] : (searchInput.value || "London");
  fetchWeatherByQuery(q);
});

locBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    setError("Geolocation not supported");
    return;
  }
  navigator.geolocation.getCurrentPosition(pos => {
    const {latitude, longitude} = pos.coords;
    fetchWeatherByCoords(latitude, longitude);
  }, () => setError("Could not get location"));
});

// initial default
fetchWeatherByQuery("London");
