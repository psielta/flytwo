namespace WebApplicationFlytwo.Entities;

public class UserInvite
{
    public Guid Id { get; set; }

    public Guid EmpresaId { get; set; }
    public Empresa Empresa { get; set; } = null!;

    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// SHA-256 hash (base64) of the invite token (never store the raw token).
    /// </summary>
    public string TokenHash { get; set; } = string.Empty;

    /// <summary>
    /// JSON array of role names to assign on redemption.
    /// </summary>
    public string? RolesJson { get; set; }

    /// <summary>
    /// JSON array of permission keys to assign on redemption (claim type: permission).
    /// </summary>
    public string? PermissionsJson { get; set; }

    public string CreatedByUserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }

    public DateTime? RedeemedAt { get; set; }
    public string? RedeemedByUserId { get; set; }

    public DateTime? RevokedAt { get; set; }
    public string? RevokedByUserId { get; set; }
}

