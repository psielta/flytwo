namespace WebApplicationFlytwo.DTOs;

public class UserInviteCreateRequest
{
    public string Email { get; set; } = string.Empty;

    public IEnumerable<string>? Roles { get; set; }
    public IEnumerable<string>? Permissions { get; set; }

    /// <summary>
    /// Defaults to 7 days.
    /// </summary>
    public int ExpiresInDays { get; set; } = 7;

    /// <summary>
    /// If true, sends an invitation email (SMTP must be configured).
    /// </summary>
    public bool SendEmail { get; set; } = false;
}

