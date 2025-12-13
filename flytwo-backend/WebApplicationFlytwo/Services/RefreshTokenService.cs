using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using WebApplicationFlytwo.Data;
using WebApplicationFlytwo.Entities;

namespace WebApplicationFlytwo.Services;

public sealed class RefreshTokenService : IRefreshTokenService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public RefreshTokenService(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<RefreshTokenIssueResult> IssueAsync(string userId, string? ipAddress = null)
    {
        var now = DateTime.UtcNow;
        var expiryDays = GetExpiryDays();

        var rawToken = GenerateToken();
        var tokenHash = ComputeHash(rawToken);

        var entity = new RefreshToken
        {
            Id = Guid.NewGuid(),
            TokenHash = tokenHash,
            UserId = userId,
            CreatedAt = now,
            ExpiresAt = now.AddDays(expiryDays),
            RevokedAt = null,
            RevokedByIp = null,
            ReplacedByTokenHash = null
        };

        _context.RefreshTokens.Add(entity);
        await _context.SaveChangesAsync();

        return new RefreshTokenIssueResult(rawToken, entity.ExpiresAt);
    }

    public async Task<RefreshTokenRotateResult?> RotateAsync(string refreshToken, string? ipAddress = null)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
            return null;

        var now = DateTime.UtcNow;
        var tokenHash = ComputeHash(refreshToken);

        var existing = await _context.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash);

        if (existing is null)
            return null;

        if (existing.RevokedAt is not null)
        {
            // Possible token reuse after rotation: revoke all active tokens for this user.
            if (!string.IsNullOrWhiteSpace(existing.ReplacedByTokenHash))
            {
                await RevokeAllAsync(existing.UserId, ipAddress);
            }

            return null;
        }

        if (existing.ExpiresAt <= now)
            return null;

        var expiryDays = GetExpiryDays();

        var newRawToken = GenerateToken();
        var newTokenHash = ComputeHash(newRawToken);

        existing.RevokedAt = now;
        existing.RevokedByIp = ipAddress;
        existing.ReplacedByTokenHash = newTokenHash;

        var replacement = new RefreshToken
        {
            Id = Guid.NewGuid(),
            TokenHash = newTokenHash,
            UserId = existing.UserId,
            CreatedAt = now,
            ExpiresAt = now.AddDays(expiryDays),
            RevokedAt = null,
            RevokedByIp = null,
            ReplacedByTokenHash = null
        };

        _context.RefreshTokens.Add(replacement);
        await _context.SaveChangesAsync();

        return new RefreshTokenRotateResult(existing.UserId, newRawToken, replacement.ExpiresAt);
    }

    public async Task<bool> RevokeAsync(string refreshToken, string? ipAddress = null)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
            return false;

        var tokenHash = ComputeHash(refreshToken);
        var entity = await _context.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenHash);
        if (entity is null)
            return false;

        if (entity.RevokedAt is null)
        {
            entity.RevokedAt = DateTime.UtcNow;
            entity.RevokedByIp = ipAddress;
            await _context.SaveChangesAsync();
        }

        return true;
    }

    public async Task<int> RevokeAllAsync(string userId, string? ipAddress = null)
    {
        var now = DateTime.UtcNow;

        var tokens = await _context.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null && t.ExpiresAt > now)
            .ToListAsync();

        foreach (var token in tokens)
        {
            token.RevokedAt = now;
            token.RevokedByIp = ipAddress;
        }

        if (tokens.Count > 0)
            await _context.SaveChangesAsync();

        return tokens.Count;
    }

    private int GetExpiryDays()
    {
        var days = _configuration.GetSection("Jwt").GetValue<int?>("RefreshTokenExpiryDays") ?? 14;
        return days <= 0 ? 14 : days;
    }

    private static string GenerateToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Base64UrlEncoder.Encode(bytes);
    }

    private static string ComputeHash(string token)
    {
        var bytes = Encoding.UTF8.GetBytes(token);
        var hashBytes = SHA256.HashData(bytes);
        return Convert.ToBase64String(hashBytes);
    }
}
