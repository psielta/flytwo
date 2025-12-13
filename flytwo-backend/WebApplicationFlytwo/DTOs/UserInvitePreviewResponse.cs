namespace WebApplicationFlytwo.DTOs;

public class UserInvitePreviewResponse
{
    public string Email { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public IEnumerable<string> Roles { get; set; } = Array.Empty<string>();
    public IEnumerable<string> Permissions { get; set; } = Array.Empty<string>();
    public DateTime ExpiresAt { get; set; }
}

