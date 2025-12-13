using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace WebApplicationFlytwo.Security;

public static class InviteTokenService
{
    public static string GenerateToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Base64UrlEncoder.Encode(bytes);
    }

    public static string ComputeHash(string token)
    {
        var bytes = Encoding.UTF8.GetBytes(token);
        var hashBytes = SHA256.HashData(bytes);
        return Convert.ToBase64String(hashBytes);
    }
}

