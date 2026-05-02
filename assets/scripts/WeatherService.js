const WMO = {
  0:  { icon: '☀️',  label: 'Clear' },
  1:  { icon: '🌤️', label: 'Mainly clear' },
  2:  { icon: '⛅',  label: 'Partly cloudy' },
  3:  { icon: '☁️',  label: 'Overcast' },
  45: { icon: '🌫️', label: 'Fog' },
  48: { icon: '🌫️', label: 'Icy fog' },
  51: { icon: '🌦️', label: 'Light drizzle' },
  53: { icon: '🌦️', label: 'Drizzle' },
  55: { icon: '🌧️', label: 'Heavy drizzle' },
  61: { icon: '🌧️', label: 'Light rain' },
  63: { icon: '🌧️', label: 'Rain' },
  65: { icon: '🌧️', label: 'Heavy rain' },
  71: { icon: '🌨️', label: 'Light snow' },
  73: { icon: '🌨️', label: 'Snow' },
  75: { icon: '❄️',  label: 'Heavy snow' },
  77: { icon: '🌨️', label: 'Snow grains' },
  80: { icon: '🌦️', label: 'Light showers' },
  81: { icon: '🌧️', label: 'Showers' },
  82: { icon: '⛈️',  label: 'Heavy showers' },
  85: { icon: '🌨️', label: 'Snow showers' },
  86: { icon: '❄️',  label: 'Heavy snow showers' },
  95: { icon: '⛈️',  label: 'Thunderstorm' },
  96: { icon: '⛈️',  label: 'Thunderstorm + hail' },
  99: { icon: '⛈️',  label: 'Thunderstorm + hail' },
};

const PRECIP_TYPE = {
  51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle',
  61: 'Rain',    63: 'Rain',    65: 'Rain',
  71: 'Snow',    73: 'Snow',    75: 'Snow',    77: 'Snow',
  80: 'Rain',    81: 'Rain',    82: 'Rain',
  85: 'Snow',    86: 'Snow',
  95: 'Thunderstorm', 96: 'Hail', 99: 'Hail',
};

function codeInfo(code) {
  return WMO[code] ?? WMO[1];
}

function precipType(code) {
  return PRECIP_TYPE[code] ?? null;
}

function precipIntensity(totalMm) {
  if (totalMm < 1) return 'light';
  if (totalMm < 5) return 'moderate';
  return 'heavy';
}

export class WeatherService {
  constructor() {
    this._cache = null;
    this._cacheTime = 0;
    this._location = null;
    this._locPromise = null;
  }

  async getLocation() {
    if (this._location) return this._location;
    if (this._locPromise) return this._locPromise;
    this._locPromise = new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return; }
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          this._location = { lat: coords.latitude, lon: coords.longitude };
          resolve(this._location);
        },
        reject,
        { timeout: 10000, maximumAge: 3600000 }
      );
    });
    return this._locPromise;
  }

  async fetchForecast() {
    if (this._cache && Date.now() - this._cacheTime < 30 * 60 * 1000) return this._cache;
    const { lat, lon } = await this.getLocation();
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&hourly=temperature_2m,apparent_temperature,weather_code,precipitation_probability,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,precipitation_sum&timezone=auto&forecast_days=16`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather unavailable');
    this._cache = await res.json();
    this._cacheTime = Date.now();
    return this._cache;
  }

  async getWeatherForDate(dateStr) {
    const data = await this.fetchForecast();
    const di = data.daily.time.indexOf(dateStr);
    if (di === -1) return null;
    const d = data.daily;
    const daily = {
      code: d.weather_code[di],
      tempMax: Math.round(d.temperature_2m_max[di]),
      feelsMax: Math.round(d.apparent_temperature_max[di]),
      precipProb: d.precipitation_probability_max[di] ?? 0,
    };

    const precipWindow = [];
    data.hourly.time.forEach((t, i) => {
      if (!t.startsWith(dateStr)) return;
      const prob = data.hourly.precipitation_probability[i] ?? 0;
      const amount = data.hourly.precipitation[i] ?? 0;
      const code = data.hourly.weather_code[i];
      if ((prob >= 30 || amount > 0.1) && precipType(code)) {
        precipWindow.push({ time: t.slice(11, 16), code, prob, amount });
      }
    });

    return { daily, precipWindow };
  }
}

export const weatherService = new WeatherService();

export function buildWeatherWidget(weather) {
  const { daily, precipWindow } = weather;
  const info = codeInfo(daily.code);

  const widget = document.createElement('div');
  widget.className = 'weather-widget';

  const icon = document.createElement('div');
  icon.className = 'weather-icon';
  icon.textContent = info.icon;

  const tempRow = document.createElement('div');
  tempRow.className = 'weather-temp-row';
  tempRow.innerHTML = `<strong>${daily.tempMax}°</strong><span class="weather-feels"> · feels like ${daily.feelsMax}°</span>`;

  const cond = document.createElement('div');
  cond.className = 'weather-cond';
  cond.textContent = info.label;

  widget.appendChild(icon);
  widget.appendChild(tempRow);
  widget.appendChild(cond);

  if (precipWindow.length > 0) {
    const firstTime = precipWindow[0].time;
    const lastH = parseInt(precipWindow[precipWindow.length - 1].time, 10);
    const endTime = `${String((lastH + 1) % 24).padStart(2, '0')}:00`;
    const maxProb = Math.max(...precipWindow.map(p => p.prob));
    const totalMm = precipWindow.reduce((s, p) => s + p.amount, 0);
    const type = precipType(precipWindow[0].code);
    const intensity = precipIntensity(totalMm);

    const precip = document.createElement('div');
    precip.className = 'weather-precip';
    precip.textContent = `${type} ${firstTime}–${endTime} (${maxProb}%, ${intensity})`;
    widget.appendChild(precip);
  } else if (daily.precipProb >= 20) {
    const precip = document.createElement('div');
    precip.className = 'weather-precip';
    precip.textContent = `${daily.precipProb}% chance of precipitation`;
    widget.appendChild(precip);
  }

  const link = document.createElement('a');
  link.className = 'weather-link';
  link.textContent = 'Weather ›';
  link.href = 'https://weather.apple.com';
  link.target = '_blank';
  link.rel = 'noopener';
  widget.appendChild(link);

  return widget;
}
