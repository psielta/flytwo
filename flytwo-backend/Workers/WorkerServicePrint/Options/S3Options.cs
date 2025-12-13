namespace WorkerServicePrint.Options;

public sealed class S3Options
{
    public string OutputPrefix { get; set; } = "reports";
    public int PreSignedUrlExpiryHours { get; set; } = 24;
}

