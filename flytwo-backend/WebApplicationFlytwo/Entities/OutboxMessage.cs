namespace WebApplicationFlytwo.Entities;

public class OutboxMessage
{
    public Guid Id { get; set; }

    public string Type { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = string.Empty;

    public DateTime OccurredAtUtc { get; set; }
    public DateTime? ProcessedAtUtc { get; set; }

    public int Attempts { get; set; }
    public DateTime? LockedUntilUtc { get; set; }
    public DateTime? LastAttemptAtUtc { get; set; }
    public string? LastError { get; set; }
}

