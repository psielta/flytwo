using WebApplicationFlytwo.Entities;

namespace WebApplicationFlytwo.DTOs;

public class NotificationInboxItemDto
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
    public DateTime? ReadAtUtc { get; set; }

    public bool IsRead => ReadAtUtc is not null;
}

