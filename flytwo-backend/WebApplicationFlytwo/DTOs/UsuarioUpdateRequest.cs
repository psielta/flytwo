namespace WebApplicationFlytwo.DTOs;

public class UsuarioUpdateRequest
{
    public string? Email { get; set; }
    public string? FullName { get; set; }

    public IEnumerable<string>? Roles { get; set; }
    public IEnumerable<string>? Permissions { get; set; }
}

