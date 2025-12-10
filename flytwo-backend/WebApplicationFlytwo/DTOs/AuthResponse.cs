namespace WebApplicationFlytwo.DTOs;

public class AuthResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public IEnumerable<string> Roles { get; set; } = Enumerable.Empty<string>();
    public string TokenType { get; set; } = "Bearer";
}
