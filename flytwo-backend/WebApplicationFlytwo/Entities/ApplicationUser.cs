using Microsoft.AspNetCore.Identity;

namespace WebApplicationFlytwo.Entities;

/// <summary>
/// Custom identity user to allow future domain fields (e.g., FullName).
/// </summary>
public class ApplicationUser : IdentityUser
{
    public string? FullName { get; set; }

    public Guid? EmpresaId { get; set; }
    public Empresa? Empresa { get; set; }
}
