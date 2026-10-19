"use strict";
// Weather and air quality from Open-Meteo (free, no API key): current
// conditions, the next hours and the next days, for a named place or for
// coordinates from the app's get_current_location tool.

const CODES = {
  0: "clear", 1: "mostly clear", 2: "partly cloudy", 3: "overcast", 45: "fog", 48: "freezing fog",
  51: "light drizzle", 53: "drizzle", 55: "heavy drizzle", 56: "freezing drizzle", 57: "freezing drizzle",
  61: "light rain", 63: "rain", 65: "heavy rain", 66: "freezing rain", 67: "freezing rain",
  71: "light snow", 73: "snow", 75: "heavy snow", 77: "snow grains", 80: "light showers", 81: "showers",
  82: "violent showers", 85: "snow showers", 86: "heavy snow showers", 95: "thunderstorm",
  96: "thunderstorm with hail", 99: "thunderstorm with heavy hail",
};

async function getJson(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("Weather service returned " + res.status);
  return res.json();
}

async function geocode(place, signal) {
  const j = await getJson("https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&name=" + encodeURIComponent(place), signal);
  const r = j.results?.[0];
  if (!r) throw new Error("Couldn't find a place called '" + place + "'.");
  return { latitude: r.latitude, longitude: r.longitude, name: [r.name, r.admin1, r.country].filter(Boolean).join(", ") };
}

const aqiLabel = (v) => (v == null ? null : v <= 50 ? "good" : v <= 100 ? "moderate" : v <= 150 ? "unhealthy for sensitive groups" : v <= 200 ? "unhealthy" : v <= 300 ? "very unhealthy" : "hazardous");

async function weather({ place, latitude, longitude, days = 3 }, { signal } = {}) {
  let loc;
  if (Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) loc = { latitude: Number(latitude), longitude: Number(longitude), name: place || "your location" };
  else if (place) loc = await geocode(String(place), signal);
  else throw new Error("Pass a place name, or latitude/longitude from get_current_location.");
  const n = Math.min(Math.max(Number(days) || 3, 1), 7);
  const q = "latitude=" + loc.latitude + "&longitude=" + loc.longitude + "&timezone=auto";
  const [w, air] = await Promise.all([
    getJson(
      "https://api.open-meteo.com/v1/forecast?" + q + "&forecast_days=" + n +
        "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation,uv_index,is_day" +
        "&hourly=temperature_2m,precipitation_probability,weather_code&forecast_hours=12" +
        "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max,wind_speed_10m_max,wind_direction_10m_dominant",
      signal,
    ),
    getJson("https://air-quality-api.open-meteo.com/v1/air-quality?" + q + "&current=us_aqi,pm2_5,pm10", signal).catch(() => null),
  ]);
  const c = w.current || {};
  const result = {
    place: loc.name,
    local_time: c.time,
    units: { temperature: "°C", wind: "km/h", precipitation: "mm" },
    now: {
      conditions: CODES[c.weather_code] ?? "unknown",
      temperature: c.temperature_2m,
      feels_like: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      wind: c.wind_speed_10m,
      precipitation: c.precipitation,
      uv_index: c.uv_index,
    },
    air_quality: air?.current ? { us_aqi: air.current.us_aqi, level: aqiLabel(air.current.us_aqi), pm2_5: air.current.pm2_5, pm10: air.current.pm10 } : null,
    next_hours: (w.hourly?.time || []).map((t, i) => ({
      time: t.slice(11, 16),
      temperature: w.hourly.temperature_2m[i],
      rain_chance: w.hourly.precipitation_probability?.[i],
      conditions: CODES[w.hourly.weather_code[i]],
    })),
    days: (w.daily?.time || []).map((d, i) => ({
      date: d,
      conditions: CODES[w.daily.weather_code[i]],
      high: w.daily.temperature_2m_max[i],
      low: w.daily.temperature_2m_min[i],
      rain_chance: w.daily.precipitation_probability_max?.[i],
      uv_max: w.daily.uv_index_max?.[i],
      sunrise: w.daily.sunrise?.[i]?.slice(11),
      sunset: w.daily.sunset?.[i]?.slice(11),
    })),
  };
  return { result, card: toCard(loc.name, w) };
}

// The notch's native weather card (toolName "weather_forecast").
const mph = (kmh) => (Number.isFinite(kmh) ? Math.round(kmh / 1.609) : undefined);
const f = (c) => (Number.isFinite(c) ? Math.round((c * 9) / 5 + 32) : undefined);
const round = (n) => (Number.isFinite(n) ? Math.round(n) : undefined);
const compass = (deg) => (Number.isFinite(deg) ? ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8] : undefined);
const clock = (iso) => {
  const m = String(iso || "").match(/T(\d\d):(\d\d)/);
  if (!m) return undefined;
  const h = Number(m[1]);
  return (h % 12 || 12) + ":" + m[2] + (h < 12 ? " AM" : " PM");
};

function toCard(place, w) {
  const c = w.current || {};
  const d = w.daily || {};
  return {
    location: place,
    quotedAt: new Date().toISOString(),
    current: {
      temp_c: round(c.temperature_2m),
      temp_f: f(c.temperature_2m),
      feels_like_c: round(c.apparent_temperature),
      feels_like_f: f(c.apparent_temperature),
      condition: CODES[c.weather_code] ?? "unknown",
      is_day: c.is_day === 1,
      humidity_pct: round(c.relative_humidity_2m),
      wind_mph: mph(c.wind_speed_10m),
      wind_gusts_mph: mph(c.wind_gusts_10m),
      wind_direction: compass(c.wind_direction_10m),
      uv_index: c.uv_index,
    },
    forecast: (d.time || []).map((day, i) => ({
      day,
      condition: CODES[d.weather_code[i]],
      high_c: round(d.temperature_2m_max[i]),
      high_f: f(d.temperature_2m_max[i]),
      low_c: round(d.temperature_2m_min[i]),
      low_f: f(d.temperature_2m_min[i]),
      rain_chance_pct: d.precipitation_probability_max?.[i],
      uv_index_max: d.uv_index_max?.[i],
      sunrise: clock(d.sunrise?.[i]),
      sunset: clock(d.sunset?.[i]),
      wind_max_mph: mph(d.wind_speed_10m_max?.[i]),
      wind_direction: compass(d.wind_direction_10m_dominant?.[i]),
    })),
  };
}

const TOOL = {
  name: "get_weather",
  label: "Checking the weather",
  description:
    "Current weather, the next 12 hours, a daily forecast and air quality (US AQI, PM2.5) for a place. Use for any weather, temperature, rain, UV, sunrise/sunset or air-quality question. If the user doesn't name a place, call get_current_location first and pass its latitude/longitude. The user sees a weather card, so answer in a sentence.",
  schema: {
    type: "object",
    properties: {
      place: { type: "string", description: "City or place name, e.g. 'Singapore' or 'Chennai'." },
      latitude: { type: "number" },
      longitude: { type: "number" },
      days: { type: "integer", description: "Days of forecast, 1-7 (default 3)." },
      focus: {
        type: "string",
        description: "What the card shows: current (default), week, rain, wind, humidity, uv, sunrise, sunset, or day:N (N days from today, e.g. day:1 = tomorrow).",
      },
    },
  },
};

async function run(args = {}, { signal } = {}) {
  const focus = args.focus || (args.days > 1 ? "week" : "current");
  const { result, card } = await weather({ ...args, days: args.days || (focus === "week" ? 7 : 3) }, { signal });
  return { content: JSON.stringify(result), detail: JSON.stringify({ ...card, focus }), toolName: "weather_forecast" };
}

module.exports = { TOOL, weather, run };
