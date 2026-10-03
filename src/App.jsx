import { useEffect, useState } from "react";
import { describeCode, getForecast, searchCity } from "./api.js";
import { useLocalStorage } from "./useLocalStorage.js";

export default function App() {
  const [query, setQuery] = useState("");
  const [place, setPlace] = useLocalStorage("weather-now:place", null);
  const [unit, setUnit] = useLocalStorage("weather-now:unit", "C");
  const [recent, setRecent] = useLocalStorage("weather-now:recent", []);
  const [forecast, setForecast] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [error, setError] = useState("");

  // Load the forecast whenever the place or unit changes
  useEffect(() => {
    if (!place) return;
    let cancelled = false; // avoids setting state from an outdated request

    async function load() {
      setStatus("loading");
      setError("");
      try {
        const data = await getForecast(place, unit);
        if (!cancelled) {
          setForecast(data);
          setStatus("idle");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setStatus("error");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [place, unit]);

  async function handleSearch(e) {
    e.preventDefault();
    const name = query.trim();
    if (!name) return;
    setStatus("loading");
    setError("");
    try {
      const found = await searchCity(name);
      setPlace(found);
      setRecent((prev) =>
        [found.city, ...prev.filter((c) => c !== found.city)].slice(0, 5)
      );
      setQuery("");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  const current = forecast?.current;
  const info = current ? describeCode(current.weather_code) : null;

  return (
    <main className="app">
      <header className="top">
        <h1>Weather Now</h1>
        <div className="units" role="group" aria-label="Temperature unit">
          {["C", "F"].map((u) => (
            <button
              key={u}
              className={unit === u ? "active" : ""}
              onClick={() => setUnit(u)}
            >
              °{u}
            </button>
          ))}
        </div>
      </header>

      <form onSubmit={handleSearch} className="search">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a city, e.g. Istanbul"
          aria-label="City name"
        />
        <button type="submit">Search</button>
      </form>

      {recent.length > 0 && (
        <div className="recent">
          {recent.map((city) => (
            <button
              key={city}
              className="chip"
              onClick={async () => {
                try {
                  setPlace(await searchCity(city));
                } catch (err) {
                  setError(err.message);
                  setStatus("error");
                }
              }}
            >
              {city}
            </button>
          ))}
        </div>
      )}

      {status === "loading" && <p className="note">Loading...</p>}
      {status === "error" && <p className="note error">{error}</p>}
      {!place && status !== "loading" && (
        <p className="note">Search for a city to see the weather.</p>
      )}

      {place && current && (
        <>
          <section className="card current">
            <p className="place">
              {place.city}, {place.country}
            </p>
            <p className="big">
              <span className="icon">{info.icon}</span>
              {Math.round(current.temperature_2m)}°{unit}
            </p>
            <p>{info.label}</p>
            <ul className="stats">
              <li>Feels like {Math.round(current.apparent_temperature)}°</li>
              <li>Humidity {current.relative_humidity_2m}%</li>
              <li>Wind {Math.round(current.wind_speed_10m)} km/h</li>
            </ul>
          </section>

          <section className="days">
            {forecast.daily.time.map((date, i) => {
              const d = describeCode(forecast.daily.weather_code[i]);
              const label = new Date(date).toLocaleDateString("en", {
                weekday: "short",
              });
              return (
                <div key={date} className="card day">
                  <p>{label}</p>
                  <p className="icon">{d.icon}</p>
                  <p>
                    {Math.round(forecast.daily.temperature_2m_max[i])}° /{" "}
                    <span className="muted">
                      {Math.round(forecast.daily.temperature_2m_min[i])}°
                    </span>
                  </p>
                </div>
              );
            })}
          </section>
        </>
      )}
    </main>
  );
}
