namespace WebApplicationFlytwo.DTOs;

public class UsuarioCreateRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? FullName { get; set; }

    public IEnumerable<string>? Roles { get; set; }
    public IEnumerable<string>? Permissions { get; set; }
}

