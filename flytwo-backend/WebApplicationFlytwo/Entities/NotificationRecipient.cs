namespace WebApplicationFlytwo.Entities;

public class NotificationRecipient
{
    public Guid NotificationId { get; set; }
    public string UserId { get; set; } = string.Empty;

    public DateTime? ReadAtUtc { get; set; }
    public DateTime? DeliveredAtUtc { get; set; }

    public Notification Notification { get; set; } = null!;
    public ApplicationUser User { get; set; } = null!;
}

