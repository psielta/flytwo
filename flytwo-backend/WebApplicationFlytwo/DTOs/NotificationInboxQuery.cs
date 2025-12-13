namespace WebApplicationFlytwo.DTOs;

public class NotificationInboxQuery
{
    public bool UnreadOnly { get; set; }
    public DateTime? FromUtc { get; set; }
    public DateTime? ToUtc { get; set; }
    public int? Severity { get; set; }

    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

