namespace WorkerServicePrint.Services;

public static class ReportTemplateRegistry
{
    private static readonly IReadOnlyDictionary<string, string> Templates =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["weather-forecast"] = "WeatherForecastReport.frx",
            ["products"] = "ProductsReport.frx"
        };

    public static string GetTemplateFileName(string reportKey)
    {
        if (Templates.TryGetValue(reportKey, out var file))
            return file;

        throw new InvalidOperationException($"Unsupported reportKey '{reportKey}'.");
    }
}

