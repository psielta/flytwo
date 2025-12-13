namespace WebApplicationFlytwo.Entities;

public class PrintJob
{
    public Guid Id { get; set; }

    public Guid EmpresaId { get; set; }
    public string CreatedByUserId { get; set; } = string.Empty;

    public string ReportKey { get; set; } = string.Empty;
    public PrintJobFormat Format { get; set; }
    public PrintJobStatus Status { get; set; }

    public string? ParametersJson { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime? StartedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }

    public int? ProgressCurrent { get; set; }
    public int? ProgressTotal { get; set; }
    public DateTime? LastProgressAtUtc { get; set; }

    public string? OutputBucket { get; set; }
    public string? OutputKey { get; set; }
    public string? OutputUrl { get; set; }
    public DateTime? OutputExpiresAtUtc { get; set; }

    public string? ErrorMessage { get; set; }
}

