namespace WebApplicationFlytwo.Services;

public static class PrintReportKeys
{
    public const string WeatherForecast = "weather-forecast";
    public const string Products = "products";

    public static readonly IReadOnlySet<string> All =
        new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            WeatherForecast,
            Products
        };
}

