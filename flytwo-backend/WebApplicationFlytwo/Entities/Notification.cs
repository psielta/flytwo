namespace WebApplicationFlytwo.Entities;

public class Notification
{
    public Guid Id { get; set; }

    public NotificationScope Scope { get; set; }
    public Guid? EmpresaId { get; set; }
    public string? TargetUserId { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Category { get; set; }
    public int? Severity { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public string? CreatedByUserId { get; set; }

    public ICollection<NotificationRecipient> Recipients { get; set; } = new List<NotificationRecipient>();
}

