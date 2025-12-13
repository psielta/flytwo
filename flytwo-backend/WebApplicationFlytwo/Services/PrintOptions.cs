namespace WebApplicationFlytwo.Services;

public sealed class PrintOptions
{
    public string WorkerApiKey { get; set; } = "dev-worker-key";
    public string RedisChannel { get; set; } = "flytwo:print:events";
}

