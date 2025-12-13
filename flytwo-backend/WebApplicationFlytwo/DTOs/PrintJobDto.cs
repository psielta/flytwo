using WebApplicationFlytwo.Entities;

namespace WebApplicationFlytwo.DTOs;

public class PrintJobDto
{
    public Guid Id { get; set; }
    public string ReportKey { get; set; } = string.Empty;
    public PrintJobFormat Format { get; set; }
    public PrintJobStatus Status { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime? StartedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }

    public int? ProgressCurrent { get; set; }
    public int? ProgressTotal { get; set; }
    public DateTime? LastProgressAtUtc { get; set; }

    public string? OutputUrl { get; set; }
    public DateTime? OutputExpiresAtUtc { get; set; }

    public string? ErrorMessage { get; set; }
}

