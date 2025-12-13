namespace WebApplicationFlytwo.Services;

public sealed class PrintJobRedisEvent
{
    public string Type { get; set; } = string.Empty; // progress | completed | failed

    public Guid JobId { get; set; }
    public string? UserId { get; set; }

    public int? Current { get; set; }
    public int? Total { get; set; }
    public string? Message { get; set; }

    public string? OutputBucket { get; set; }
    public string? OutputKey { get; set; }
    public string? OutputUrl { get; set; }
    public DateTime? OutputExpiresAtUtc { get; set; }

    public string? ErrorMessage { get; set; }
    public DateTime OccurredAtUtc { get; set; }
}

