"use client";

import { useEffect, useState } from "react";

// Weather for the K–5 toolbar tile. The only thing that leaves the browser is a city name taken
// from the student timezone (Asia/Kuwait -> "Kuwait") and then that city coordinates: no name,
// id, school or device location is sent. A timezone without a city (UTC, Etc/GMT+5) or any
// failed request shows no tile at all, never made-up weather.
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
const FRESH_MS = 30 * 60 * 1000;

// Legacy IANA names that still arrive from the backend, mapped to the city name the geocoder knows.
const CITY_ALIAS = { Calcutta: "Kolkata", Saigon: "Ho Chi Minh City", Katmandu: "Kathmandu", Rangoon: "Yangon" };

const cityFromTimezone = (timezone) => {
  const parts = String(timezone || "").split("/");
  if (parts.length < 2 || parts[0] === "Etc") return "";
  const city = parts[parts.length - 1].replace(/_/g, " ");
  return CITY_ALIAS[city] || city;
};

// Same zone under its legacy or current name (Asia/Calcutta == Asia/Kolkata).
const sameZone = (a, b) => {
  if (!a || !b) return false;
  if (a === b) return true;
  try {
    const norm = (z) => new Intl.DateTimeFormat("en", { timeZone: z }).resolvedOptions().timeZone;
    return norm(a) === norm(b);
  } catch {
    return false;
  }
};

function readCache(key) {
  try {
    return JSON.parse(window.sessionStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}
function writeCache(key, value) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable: the next load simply asks again
  }
}

async function getJson(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("weather request failed");
  return response.json();
}

/** { celsius, code, isDay } for the student timezone city, or null while loading / when unavailable. */
export function useK5Weather(timezone) {
  // debugger
  const [state, setState] = useState({ timezone: null, weather: null });

  useEffect(() => {
    const city = cityFromTimezone(timezone);
    if (!city) return undefined;
    const controller = new AbortController();
    const finish = (weather) => {
      if (!controller.signal.aborted) setState({ timezone, weather });
    };

    (async () => {
      try {
        debugger
        const cached = readCache("is-k5-wx:" + timezone);
        if (cached && Date.now() - cached.at < FRESH_MS) {
          finish(cached.weather);
          return;
        }
        let place = readCache("is-k5-wx-place2:" + timezone);
        if (!place) {
          const geo = await getJson(GEO_URL + "?count=10&language=en&format=json&name=" + encodeURIComponent(city), controller.signal);
          // Many places share a city name (Calcutta is also a town in South Africa): only a match whose own
          // timezone is the student timezone counts; otherwise no tile rather than another country weather.
          const hit = geo && geo.results && geo.results.find((r) => sameZone(r.timezone, timezone));
          if (!hit || typeof hit.latitude !== "number" || typeof hit.longitude !== "number") return;
          place = { latitude: hit.latitude, longitude: hit.longitude };
          writeCache("is-k5-wx-place2:" + timezone, place);
        }
        const data = await getJson(
          WEATHER_URL + "?current=temperature_2m,weather_code,is_day&timezone=auto&latitude=" + place.latitude + "&longitude=" + place.longitude,
          controller.signal,
        );
        debugger
        console.log("useK5Weather", { timezone, city, place, data });
        const current = data && data.current;
        if (!current || typeof current.temperature_2m !== "number") return;
        const weather = { celsius: current.temperature_2m, code: current.weather_code, isDay: current.is_day !== 0 };
        writeCache("is-k5-wx:" + timezone, { at: Date.now(), weather });
        finish(weather);
      } catch {
        // offline or blocked: no tile
      }
    })();

    return () => controller.abort();
  }, [timezone]);

  return state.timezone === timezone ? state.weather : null;
}
