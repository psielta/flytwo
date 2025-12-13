using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using WebApplicationFlytwo.Entities;
using WebApplicationFlytwo.Security;

namespace WebApplicationFlytwo.Controllers;

/// <summary>
/// Controller base com helpers para dados do usuário autenticado.
/// </summary>
public abstract class BaseApiController : ControllerBase
{
    protected string? UserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ??
        User.FindFirstValue(JwtRegisteredClaimNames.Sub);

    protected string? UserEmail => User.FindFirstValue(ClaimTypes.Email);

    protected string? JwtEmail => User.FindFirstValue(JwtRegisteredClaimNames.Email);

    protected string? UserNameOrEmail =>
        User.Identity?.Name ?? UserEmail ?? JwtEmail;

    protected bool IsAuthenticated => User?.Identity?.IsAuthenticated == true;

    protected IEnumerable<string> UserRoles =>
        User?.Claims
            .Where(c => c.Type == ClaimTypes.Role)
            .Select(c => c.Value)
        ?? Enumerable.Empty<string>();

    protected Guid? EmpresaId
    {
        get
        {
            var raw = User.FindFirstValue(FlytwoClaimTypes.EmpresaId);
            return Guid.TryParse(raw, out var id) && id != Guid.Empty ? id : null;
        }
    }

    protected Task<ApplicationUser?> GetCurrentUserAsync(UserManager<ApplicationUser> userManager)
    {
        if (UserId is null)
            return Task.FromResult<ApplicationUser?>(null);

        return userManager.FindByIdAsync(UserId);
    }
}
