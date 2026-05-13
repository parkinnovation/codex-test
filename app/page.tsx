"use client";

import {
  CloudRain,
  CloudSun,
  Compass,
  Droplets,
  Loader2,
  LocateFixed,
  RefreshCw,
  Sun,
  ThermometerSun,
  Wind,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

const DEFAULT_PLACE: Place = {
  label: "Sao Paulo, BR",
  latitude: -23.5505,
  longitude: -46.6333,
};

const weatherText: Record<number, string> = {
  0: "Ceu limpo",
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
    throw new Error("Nao foi possivel carregar a previsao agora.");
  }

  return (await response.json()) as Forecast;
}

export default function Home() {
  const [place, setPlace] = useState<Place>(DEFAULT_PLACE);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const today = forecast?.daily;
  const condition = forecast
    ? weatherText[forecast.current.weather_code] ?? "Tempo variavel"
    : "Carregando";

  const metrics = useMemo(() => {
    if (!forecast || !today) return [];

    return [
      {
        label: "Sensacao",
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

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Seu navegador nao permite consultar a localizacao.");
      return;
    }

    setIsLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextPlace = {
          label: "Sua localizacao",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setPlace(nextPlace);
        setIsLocating(false);
        refresh(nextPlace);
      },
      () => {
        setIsLocating(false);
        setError("Nao foi possivel acessar sua localizacao.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  useEffect(() => refresh(DEFAULT_PLACE), []);

  return (
    <main className="weather-shell">
      <section className="panel">
        <div className="topbar">
          <div>
            <span className="eyebrow">Previsao de hoje</span>
            <h1>{place.label}</h1>
          </div>
          <div className="actions" aria-label="Acoes da previsao">
            <button
              className="icon-button"
              type="button"
              onClick={() => refresh()}
              aria-label="Atualizar previsao"
              title="Atualizar previsao"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="spin" /> : <RefreshCw />}
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={useCurrentLocation}
              aria-label="Usar localizacao atual"
              title="Usar localizacao atual"
              disabled={isLocating}
            >
              {isLocating ? <Loader2 className="spin" /> : <LocateFixed />}
            </button>
          </div>
        </div>

        {error ? <p className="error">{error}</p> : null}

        <div className="forecast-grid">
          <div className="current-card">
            <div className="condition">
              <CloudSun aria-hidden="true" />
              <span>{condition}</span>
            </div>
            <div className="temperature">
              {forecast ? Math.round(forecast.current.temperature_2m) : "--"}
              <span>°C</span>
            </div>
            <p>
              Max {today ? Math.round(today.temperature_2m_max[0]) : "--"}° ·
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
            <span>Direcao do vento</span>
            <strong>
              {forecast
                ? windDirection(forecast.current.wind_direction_10m)
                : "--"}
            </strong>
          </div>
          <div>
            <CloudSun aria-hidden="true" />
            <span>Por do sol</span>
            <strong>{today ? formatHour(today.sunset[0]) : "--:--"}</strong>
          </div>
        </div>

        <footer>
          <span>Dados: Open-Meteo</span>
          <span>
            {updatedAt
              ? `Atualizado as ${updatedAt.toLocaleTimeString("pt-BR", {
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
