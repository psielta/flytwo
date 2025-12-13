using WebApplicationFlytwo.Entities;

namespace WebApplicationFlytwo.DTOs;

public class NotificationDto
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
}

