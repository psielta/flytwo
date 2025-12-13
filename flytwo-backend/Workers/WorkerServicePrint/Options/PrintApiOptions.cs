namespace WorkerServicePrint.Options;

public sealed class PrintApiOptions
{
    public string BaseUrl { get; set; } = "http://localhost:5110/";
    public string WorkerApiKey { get; set; } = "dev-worker-key";
}

