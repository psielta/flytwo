import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip
} from "@mui/material";
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
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Weather Forecast
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell align="right">Temp (C)</TableCell>
              <TableCell align="right">Temp (F)</TableCell>
              <TableCell>Summary</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {forecasts.map((forecast, index) => (
              <TableRow key={index} hover>
                <TableCell>{forecast.date}</TableCell>
                <TableCell align="right">
                  <Chip label={`${forecast.temperatureC}°C`} size="small" color="primary" variant="outlined" />
                </TableCell>
                <TableCell align="right">
                  <Chip label={`${forecast.temperatureF}°F`} size="small" color="secondary" variant="outlined" />
                </TableCell>
                <TableCell>{forecast.summary}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
