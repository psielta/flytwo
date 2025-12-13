namespace WebApplicationFlytwo.DTOs;

public class UserInviteResponse
{
    public Guid Id { get; set; }
    public Guid EmpresaId { get; set; }
    public string Email { get; set; } = string.Empty;

    public IEnumerable<string> Roles { get; set; } = Array.Empty<string>();
    public IEnumerable<string> Permissions { get; set; } = Array.Empty<string>();

    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? RedeemedAt { get; set; }
    public DateTime? RevokedAt { get; set; }
}

