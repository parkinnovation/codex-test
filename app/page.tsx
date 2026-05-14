"use client";

import {
  Activity,
  CloudRain,
  CloudSun,
  Compass,
  Droplets,
  Loader2,
  LocateFixed,
  RefreshCw,
  Search,
  Sun,
  ThermometerSun,
  Wind,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Forecast = {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    sunrise: string[];
    sunset: string[];
  };
  timezone: string;
};

type Place = {
  label: string;
  latitude: number;
  longitude: number;
};

type GeocodingResult = {
  name: string;
  latitude: number;
  longitude: number;
  country_code?: string;
  admin1?: string;
};

type GeocodingResponse = {
  results?: GeocodingResult[];
};

const DEFAULT_PLACE: Place = {
  label: "São Paulo, BR",
  latitude: -23.5505,
  longitude: -46.6333,
};

const weatherText: Record<number, string> = {
  0: "Céu limpo",
  1: "Principalmente claro",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Neblina",
  48: "Neblina com geada",
  51: "Garoa leve",
  53: "Garoa moderada",
  55: "Garoa intensa",
  61: "Chuva leve",
  63: "Chuva moderada",
  65: "Chuva forte",
  80: "Pancadas leves",
  81: "Pancadas moderadas",
  82: "Pancadas fortes",
  95: "Tempestade",
};

function formatHour(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function windDirection(degrees: number) {
  const directions = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"];
  return directions[Math.round(degrees / 45) % 8];
}

async function loadForecast(place: Place, signal?: AbortSignal) {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m",
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
    forecast_days: "1",
    timezone: "auto",
  });

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error("Não foi possível carregar a previsão agora.");
  }

  return (await response.json()) as Forecast;
}

async function searchPlace(query: string, signal?: AbortSignal) {
  const params = new URLSearchParams({
    name: query,
    count: "1",
    language: "pt",
    format: "json",
  });

  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error("Não foi possível pesquisar essa cidade agora.");
  }

  const data = (await response.json()) as GeocodingResponse;
  const result = data.results?.[0];

  if (!result) {
    throw new Error("Cidade não encontrada.");
  }

  return {
    label: [result.name, result.admin1, result.country_code]
      .filter(Boolean)
      .join(", "),
    latitude: result.latitude,
    longitude: result.longitude,
  } satisfies Place;
}

export default function Home() {
  const [place, setPlace] = useState<Place>(DEFAULT_PLACE);
  const [searchQuery, setSearchQuery] = useState("");
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const today = forecast?.daily;
  const condition = forecast
    ? weatherText[forecast.current.weather_code] ?? "Tempo variável"
    : "Carregando";

  const metrics = useMemo(() => {
    if (!forecast || !today) return [];

    return [
      {
        label: "Sensação",
        value: `${Math.round(forecast.current.apparent_temperature)}°C`,
        icon: ThermometerSun,
      },
      {
        label: "Umidade",
        value: `${forecast.current.relative_humidity_2m}%`,
        icon: Droplets,
      },
      {
        label: "Vento",
        value: `${Math.round(forecast.current.wind_speed_10m)} km/h`,
        icon: Wind,
      },
      {
        label: "Chuva",
        value: `${today.precipitation_probability_max[0]}%`,
        icon: CloudRain,
      },
    ];
  }, [forecast, today]);

  function refresh(currentPlace = place) {
    const controller = new AbortController();
    setIsLoading(true);
    setError("");

    loadForecast(currentPlace, controller.signal)
      .then((data) => {
        setForecast(data);
        setUpdatedAt(new Date());
      })
      .catch((caughtError: Error) => {
        if (caughtError.name !== "AbortError") {
          setError(caughtError.message);
        }
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = searchQuery.trim();
    if (!query) return;

    const controller = new AbortController();
    setIsSearching(true);
    setError("");

    searchPlace(query, controller.signal)
      .then((nextPlace) => {
        setPlace(nextPlace);
        setSearchQuery("");
        refresh(nextPlace);
      })
      .catch((caughtError: Error) => {
        if (caughtError.name !== "AbortError") {
          setError(caughtError.message);
        }
      })
      .finally(() => setIsSearching(false));
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Seu navegador não permite consultar a localização.");
      return;
    }

    setIsLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextPlace = {
          label: "Sua localização",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setPlace(nextPlace);
        setIsLocating(false);
        refresh(nextPlace);
      },
      () => {
        setIsLocating(false);
        setError("Não foi possível acessar sua localização.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  useEffect(() => refresh(DEFAULT_PLACE), []);

  return (
    <main className="weather-shell">
      <div className="ambient-grid" aria-hidden="true" />
      <section className="panel">
        <div className="topbar">
          <div>
            <span className="eyebrow">
              <Activity aria-hidden="true" />
              Clima em tempo real
            </span>
            <h1>{place.label}</h1>
          </div>
          <div className="toolbar">
            <form className="city-search" onSubmit={handleSearch}>
              <Search aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Pesquisar cidade"
                aria-label="Pesquisar cidade"
              />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                aria-label="Buscar cidade"
                title="Buscar cidade"
              >
                {isSearching ? <Loader2 className="spin" /> : <Search />}
              </button>
            </form>
            <div className="actions" aria-label="Ações da previsão">
              <button
                className="icon-button"
                type="button"
                onClick={() => refresh()}
                aria-label="Atualizar previsão"
                title="Atualizar previsão"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="spin" /> : <RefreshCw />}
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={useCurrentLocation}
                aria-label="Usar localização atual"
                title="Usar localização atual"
                disabled={isLocating}
              >
                {isLocating ? <Loader2 className="spin" /> : <LocateFixed />}
              </button>
            </div>
          </div>
        </div>

        {error ? <p className="error">{error}</p> : null}

        <div className="forecast-grid">
          <div className="current-card">
            <div className="scanline" aria-hidden="true" />
            <div className="condition">
              <CloudSun aria-hidden="true" />
              <span>{condition}</span>
            </div>
            <div className="temperature">
              {forecast ? Math.round(forecast.current.temperature_2m) : "--"}
              <span>°C</span>
            </div>
            <p>
              Max {today ? Math.round(today.temperature_2m_max[0]) : "--"}° /
              Min {today ? Math.round(today.temperature_2m_min[0]) : "--"}°
            </p>
          </div>

          <div className="details">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <article className="metric" key={metric.label}>
                  <Icon aria-hidden="true" />
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </article>
              );
            })}
          </div>
        </div>

        <div className="sun-band">
          <div>
            <Sun aria-hidden="true" />
            <span>Nascer do sol</span>
            <strong>{today ? formatHour(today.sunrise[0]) : "--:--"}</strong>
          </div>
          <div>
            <Compass aria-hidden="true" />
            <span>Direção do vento</span>
            <strong>
              {forecast
                ? windDirection(forecast.current.wind_direction_10m)
                : "--"}
            </strong>
          </div>
          <div>
            <CloudSun aria-hidden="true" />
            <span>Pôr do sol</span>
            <strong>{today ? formatHour(today.sunset[0]) : "--:--"}</strong>
          </div>
        </div>

        <footer>
          <span>Dados: Open-Meteo</span>
          <span>
            {updatedAt
              ? `Atualizado às ${updatedAt.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : "Aguardando dados"}
          </span>
        </footer>
      </section>
    </main>
  );
}
