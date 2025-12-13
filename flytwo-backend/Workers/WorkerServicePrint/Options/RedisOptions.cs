namespace WorkerServicePrint.Options;

public sealed class RedisOptions
{
    public string ConnectionString { get; set; } = "localhost:6379";
    public string Channel { get; set; } = "flytwo:print:events";
}

