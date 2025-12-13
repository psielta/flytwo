using System.Security.Cryptography;
using System.Text;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using WebApplicationFlytwo.Services;
using WebApplicationFlytwo.Tests.Fixtures;

namespace WebApplicationFlytwo.Tests.Services;

public class RefreshTokenServiceTests : IClassFixture<TestFixture>
{
    private readonly TestFixture _fixture;

    public RefreshTokenServiceTests(TestFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task IssueAsync_CreatesHashedTokenInDatabase()
    {
        using var context = _fixture.CreateContext();
        var configuration = CreateConfiguration(refreshTokenExpiryDays: 14);
        var service = new RefreshTokenService(context, configuration);

        var result = await service.IssueAsync(userId: "user-1", ipAddress: "127.0.0.1");

        result.RefreshToken.Should().NotBeNullOrWhiteSpace();
        result.ExpiresAt.Should().BeAfter(DateTime.UtcNow.AddDays(13));

        var stored = context.RefreshTokens.Single();
        stored.UserId.Should().Be("user-1");
        stored.TokenHash.Should().Be(ComputeHash(result.RefreshToken));
        stored.TokenHash.Should().NotBe(result.RefreshToken);
        stored.RevokedAt.Should().BeNull();
    }

    [Fact]
    public async Task RotateAsync_WithValidToken_RevokesOldAndCreatesNew()
    {
        using var context = _fixture.CreateContext();
        var configuration = CreateConfiguration(refreshTokenExpiryDays: 14);
        var service = new RefreshTokenService(context, configuration);

        var issued = await service.IssueAsync(userId: "user-1", ipAddress: "127.0.0.1");

        var rotated = await service.RotateAsync(issued.RefreshToken, ipAddress: "127.0.0.1");

        rotated.Should().NotBeNull();
        rotated!.UserId.Should().Be("user-1");
        rotated.RefreshToken.Should().NotBeNullOrWhiteSpace();
        rotated.RefreshToken.Should().NotBe(issued.RefreshToken);

        context.RefreshTokens.Should().HaveCount(2);
        var oldToken = context.RefreshTokens.Single(t => t.TokenHash == ComputeHash(issued.RefreshToken));
        var newToken = context.RefreshTokens.Single(t => t.TokenHash == ComputeHash(rotated.RefreshToken));

        oldToken.RevokedAt.Should().NotBeNull();
        oldToken.RevokedByIp.Should().Be("127.0.0.1");
        oldToken.ReplacedByTokenHash.Should().Be(newToken.TokenHash);

        newToken.RevokedAt.Should().BeNull();
    }

    [Fact]
    public async Task RotateAsync_WhenRevokedTokenIsReused_RevokesAllActiveTokens()
    {
        using var context = _fixture.CreateContext();
        var configuration = CreateConfiguration(refreshTokenExpiryDays: 14);
        var service = new RefreshTokenService(context, configuration);

        var issued = await service.IssueAsync(userId: "user-1", ipAddress: "127.0.0.1");
        var rotated = await service.RotateAsync(issued.RefreshToken, ipAddress: "127.0.0.1");
        rotated.Should().NotBeNull();

        // Reuse the already rotated token (suspicious)
        var second = await service.RotateAsync(issued.RefreshToken, ipAddress: "127.0.0.1");
        second.Should().BeNull();

        var activeTokens = context.RefreshTokens.Where(t => t.RevokedAt == null && t.ExpiresAt > DateTime.UtcNow).ToList();
        activeTokens.Should().BeEmpty();
    }

    [Fact]
    public async Task RevokeAsync_RevokesToken()
    {
        using var context = _fixture.CreateContext();
        var configuration = CreateConfiguration(refreshTokenExpiryDays: 14);
        var service = new RefreshTokenService(context, configuration);

        var issued = await service.IssueAsync(userId: "user-1", ipAddress: "127.0.0.1");

        var revoked = await service.RevokeAsync(issued.RefreshToken, ipAddress: "127.0.0.1");
        revoked.Should().BeTrue();

        var stored = context.RefreshTokens.Single();
        stored.RevokedAt.Should().NotBeNull();
        stored.RevokedByIp.Should().Be("127.0.0.1");
    }

    private static IConfiguration CreateConfiguration(int refreshTokenExpiryDays)
    {
        var dict = new Dictionary<string, string?>
        {
            ["Jwt:RefreshTokenExpiryDays"] = refreshTokenExpiryDays.ToString()
        };

        return new ConfigurationBuilder()
            .AddInMemoryCollection(dict)
            .Build();
    }

    private static string ComputeHash(string token)
    {
        var bytes = Encoding.UTF8.GetBytes(token);
        var hashBytes = SHA256.HashData(bytes);
        return Convert.ToBase64String(hashBytes);
    }
}

