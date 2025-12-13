namespace WebApplicationFlytwo.Services;

public interface IRefreshTokenService
{
    Task<RefreshTokenIssueResult> IssueAsync(string userId, string? ipAddress = null);
    Task<RefreshTokenRotateResult?> RotateAsync(string refreshToken, string? ipAddress = null);
    Task<bool> RevokeAsync(string refreshToken, string? ipAddress = null);
    Task<int> RevokeAllAsync(string userId, string? ipAddress = null);
}

public sealed record RefreshTokenIssueResult(string RefreshToken, DateTime ExpiresAt);

public sealed record RefreshTokenRotateResult(string UserId, string RefreshToken, DateTime ExpiresAt);
