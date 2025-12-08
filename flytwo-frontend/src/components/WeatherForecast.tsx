import { useEffect, useState } from "react";
import { ApiClient } from "../api/api-client";
import type { WeatherForecast as WeatherForecastDto } from "../api/api-client";

const client = new ApiClient("http://localhost:5110");

export function WeatherForecast() {
  const [forecasts, setForecasts] = useState<WeatherForecastDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const data = await client.getWeatherForecast(controller.signal);
        setForecasts(data);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    return () => controller.abort();
  }, []);

  if (loading) {
    return <div>Loading weather forecast...</div>;
  }

  if (error) {
    return <div style={{ color: "red" }}>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Weather Forecast</h2>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Temp (C)</th>
            <th style={thStyle}>Temp (F)</th>
            <th style={thStyle}>Summary</th>
          </tr>
        </thead>
        <tbody>
          {forecasts.map((forecast, index) => (
            <tr key={index}>
              <td style={tdStyle}>{forecast.date}</td>
              <td style={tdStyle}>{forecast.temperatureC}</td>
              <td style={tdStyle}>{forecast.temperatureF}</td>
              <td style={tdStyle}>{forecast.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: "8px",
  textAlign: "left",
  backgroundColor: "#4CAF50",
  color: "white",
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: "8px",
};
