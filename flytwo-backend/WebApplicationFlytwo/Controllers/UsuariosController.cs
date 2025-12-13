using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Swashbuckle.AspNetCore.Annotations;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Entities;
using WebApplicationFlytwo.Security;
using WebApplicationFlytwo.Services;

namespace WebApplicationFlytwo.Controllers;

[ApiController]
[Route("api/usuarios")]
public class UsuariosController : BaseApiController
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IAuthRealtimeNotifier _authRealtimeNotifier;
    private readonly ILogger<UsuariosController> _logger;

    public UsuariosController(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        IAuthRealtimeNotifier authRealtimeNotifier,
        ILogger<UsuariosController> logger)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _authRealtimeNotifier = authRealtimeNotifier;
        _logger = logger;
    }

    [HttpGet("roles")]
    [Authorize(Policy = PermissionCatalog.Usuarios.Visualizar)]
    [SwaggerOperation(Summary = "Listar roles disponíveis")]
    [ProducesResponseType(typeof(IEnumerable<string>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<string>> ListarRoles()
    {
        var roles = _roleManager.Roles
            .AsNoTracking()
            .OrderBy(r => r.Name)
            .Select(r => r.Name!)
            .ToArray();

        return Ok(roles);
    }

    [HttpGet("permissoes")]
    [Authorize(Policy = PermissionCatalog.Usuarios.Visualizar)]
    [SwaggerOperation(Summary = "Listar permissões (claims) disponíveis")]
    [ProducesResponseType(typeof(IEnumerable<PermissionDefinition>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<PermissionDefinition>> ListarPermissoes()
    {
        return Ok(PermissionCatalog.All);
    }

    [HttpGet]
    [Authorize(Policy = PermissionCatalog.Usuarios.Visualizar)]
    [SwaggerOperation(Summary = "Listar usuários da empresa do usuário autenticado")]
    [ProducesResponseType(typeof(IEnumerable<UsuarioResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<UsuarioResponse>>> Listar()
    {
        if (EmpresaId is null)
            return Forbid();
        var empresaId = EmpresaId.Value;

        var users = await _userManager.Users
            .AsNoTracking()
            .Where(u => u.EmpresaId == empresaId)
            .OrderBy(u => u.Email)
            .ToListAsync();

        var response = new List<UsuarioResponse>(users.Count);
        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            var permissions = (await _userManager.GetClaimsAsync(user))
                .Where(c => c.Type == FlytwoClaimTypes.Permission)
                .Select(c => c.Value)
                .Distinct()
                .OrderBy(x => x)
                .ToArray();

            response.Add(new UsuarioResponse
            {
                Id = user.Id,
                Email = user.Email ?? string.Empty,
                FullName = user.FullName,
                EmpresaId = user.EmpresaId,
                Roles = roles.OrderBy(x => x).ToArray(),
                Permissions = permissions
            });
        }

        return Ok(response);
    }

    [HttpGet("{id}")]
    [Authorize(Policy = PermissionCatalog.Usuarios.Visualizar)]
    [SwaggerOperation(Summary = "Obter usuário por id (limitado à mesma empresa)")]
    [ProducesResponseType(typeof(UsuarioResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UsuarioResponse>> ObterPorId([FromRoute] string id)
    {
        if (EmpresaId is null)
            return Forbid();
        var empresaId = EmpresaId.Value;

        var user = await _userManager.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id && u.EmpresaId == empresaId);

        if (user is null)
            return NotFound();

        var roles = await _userManager.GetRolesAsync(user);
        var permissions = (await _userManager.GetClaimsAsync(user))
            .Where(c => c.Type == FlytwoClaimTypes.Permission)
            .Select(c => c.Value)
            .Distinct()
            .OrderBy(x => x)
            .ToArray();

        return Ok(new UsuarioResponse
        {
            Id = user.Id,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            EmpresaId = user.EmpresaId,
            Roles = roles.OrderBy(x => x).ToArray(),
            Permissions = permissions
        });
    }

    [HttpPost]
    [Authorize(Policy = PermissionCatalog.Usuarios.Criar)]
    [SwaggerOperation(Summary = "Criar usuário na empresa do usuário autenticado")]
    [ProducesResponseType(typeof(UsuarioResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UsuarioResponse>> Criar([FromBody] UsuarioCreateRequest request)
    {
        if (EmpresaId is null)
            return Forbid();
        var empresaId = EmpresaId.Value;

        var existing = await _userManager.FindByEmailAsync(request.Email);
        if (existing is not null)
            return Conflict(new { message = "User already exists." });

        var desiredRoles = (request.Roles ?? new[] { FlytwoRoles.User })
            .Select(r => r.Trim())
            .Where(r => !string.IsNullOrWhiteSpace(r))
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        foreach (var role in desiredRoles)
        {
            if (!await _roleManager.RoleExistsAsync(role))
                return BadRequest(new { message = $"Role '{role}' does not exist." });
        }

        var desiredPermissions = (request.Permissions ?? Array.Empty<string>())
            .Select(p => p.Trim())
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        var unknownPermissions = desiredPermissions.Where(p => !PermissionCatalog.IsKnown(p)).ToArray();
        if (unknownPermissions.Length > 0)
        {
            return BadRequest(new { message = "Unknown permissions.", unknownPermissions });
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName,
            EmpresaId = empresaId
        };

        var createResult = await _userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
            return BadRequest(new { errors = createResult.Errors.Select(e => e.Description) });

        if (desiredRoles.Length > 0)
        {
            var addRolesResult = await _userManager.AddToRolesAsync(user, desiredRoles);
            if (!addRolesResult.Succeeded)
                return BadRequest(new { errors = addRolesResult.Errors.Select(e => e.Description) });
        }

        if (desiredPermissions.Length > 0)
        {
            var permissionClaims = desiredPermissions.Select(p => new Claim(FlytwoClaimTypes.Permission, p)).ToArray();
            var addClaimsResult = await _userManager.AddClaimsAsync(user, permissionClaims);
            if (!addClaimsResult.Succeeded)
                return BadRequest(new { errors = addClaimsResult.Errors.Select(e => e.Description) });
        }

        _logger.LogInformation("User {UserId} created in company {EmpresaId}", user.Id, empresaId);

        return CreatedAtAction(nameof(ObterPorId), new { id = user.Id }, new UsuarioResponse
        {
            Id = user.Id,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            EmpresaId = user.EmpresaId,
            Roles = desiredRoles.OrderBy(x => x).ToArray(),
            Permissions = desiredPermissions.OrderBy(x => x).ToArray()
        });
    }

    [HttpPut("{id}")]
    [Authorize(Policy = PermissionCatalog.Usuarios.Editar)]
    [SwaggerOperation(Summary = "Atualizar usuário (limitado à mesma empresa)")]
    [ProducesResponseType(typeof(UsuarioResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UsuarioResponse>> Atualizar([FromRoute] string id, [FromBody] UsuarioUpdateRequest request)
    {
        if (EmpresaId is null)
            return Forbid();
        var empresaId = EmpresaId.Value;

        var user = await _userManager.Users.FirstOrDefaultAsync(u => u.Id == id && u.EmpresaId == empresaId);
        if (user is null)
            return NotFound();

        var authChanged = false;

        if (!string.IsNullOrWhiteSpace(request.Email) && !string.Equals(request.Email, user.Email, StringComparison.OrdinalIgnoreCase))
        {
            user.Email = request.Email;
            user.UserName = request.Email;
        }

        if (request.FullName is not null)
        {
            user.FullName = string.IsNullOrWhiteSpace(request.FullName) ? null : request.FullName;
        }

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
            return BadRequest(new { errors = updateResult.Errors.Select(e => e.Description) });

        if (request.Roles is not null)
        {
            authChanged = true;
            var desiredRoles = request.Roles
                .Select(r => r.Trim())
                .Where(r => !string.IsNullOrWhiteSpace(r))
                .Distinct(StringComparer.Ordinal)
                .ToArray();

            foreach (var role in desiredRoles)
            {
                if (!await _roleManager.RoleExistsAsync(role))
                    return BadRequest(new { message = $"Role '{role}' does not exist." });
            }

            var currentRoles = await _userManager.GetRolesAsync(user);
            var toRemove = currentRoles.Except(desiredRoles, StringComparer.Ordinal).ToArray();
            var toAdd = desiredRoles.Except(currentRoles, StringComparer.Ordinal).ToArray();

            if (toRemove.Length > 0)
            {
                var removeResult = await _userManager.RemoveFromRolesAsync(user, toRemove);
                if (!removeResult.Succeeded)
                    return BadRequest(new { errors = removeResult.Errors.Select(e => e.Description) });
            }

            if (toAdd.Length > 0)
            {
                var addResult = await _userManager.AddToRolesAsync(user, toAdd);
                if (!addResult.Succeeded)
                    return BadRequest(new { errors = addResult.Errors.Select(e => e.Description) });
            }
        }

        if (request.Permissions is not null)
        {
            authChanged = true;
            var desiredPermissions = request.Permissions
                .Select(p => p.Trim())
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .Distinct(StringComparer.Ordinal)
                .ToArray();

            var unknownPermissions = desiredPermissions.Where(p => !PermissionCatalog.IsKnown(p)).ToArray();
            if (unknownPermissions.Length > 0)
            {
                return BadRequest(new { message = "Unknown permissions.", unknownPermissions });
            }

            var currentClaims = await _userManager.GetClaimsAsync(user);
            var currentPermissionClaims = currentClaims
                .Where(c => c.Type == FlytwoClaimTypes.Permission)
                .ToArray();

            var currentPermissions = currentPermissionClaims.Select(c => c.Value).ToArray();

            var toRemove = currentPermissionClaims
                .Where(c => !desiredPermissions.Contains(c.Value, StringComparer.Ordinal))
                .ToArray();

            if (toRemove.Length > 0)
            {
                var removeResult = await _userManager.RemoveClaimsAsync(user, toRemove);
                if (!removeResult.Succeeded)
                    return BadRequest(new { errors = removeResult.Errors.Select(e => e.Description) });
            }

            var toAdd = desiredPermissions
                .Where(p => !currentPermissions.Contains(p, StringComparer.Ordinal))
                .Select(p => new Claim(FlytwoClaimTypes.Permission, p))
                .ToArray();

            if (toAdd.Length > 0)
            {
                var addResult = await _userManager.AddClaimsAsync(user, toAdd);
                if (!addResult.Succeeded)
                    return BadRequest(new { errors = addResult.Errors.Select(e => e.Description) });
            }
        }

        var roles = await _userManager.GetRolesAsync(user);
        var permissions = (await _userManager.GetClaimsAsync(user))
            .Where(c => c.Type == FlytwoClaimTypes.Permission)
            .Select(c => c.Value)
            .Distinct()
            .OrderBy(x => x)
            .ToArray();

        _logger.LogInformation("User {UserId} updated in company {EmpresaId}", user.Id, empresaId);
        if (authChanged)
        {
            await _authRealtimeNotifier.NotifyUserAuthChangedAsync(user.Id, "RolesOrPermissionsChanged");
        }

        return Ok(new UsuarioResponse
        {
            Id = user.Id,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            EmpresaId = user.EmpresaId,
            Roles = roles.OrderBy(x => x).ToArray(),
            Permissions = permissions
        });
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = PermissionCatalog.Usuarios.Excluir)]
    [SwaggerOperation(Summary = "Excluir usuário (limitado à mesma empresa)")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Excluir([FromRoute] string id)
    {
        if (EmpresaId is null)
            return Forbid();
        var empresaId = EmpresaId.Value;

        if (string.Equals(UserId, id, StringComparison.Ordinal))
            return BadRequest(new { message = "Você não pode excluir o próprio usuário." });

        var user = await _userManager.Users.FirstOrDefaultAsync(u => u.Id == id && u.EmpresaId == empresaId);
        if (user is null)
            return NotFound();

        var result = await _userManager.DeleteAsync(user);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        _logger.LogInformation("User {UserId} deleted in company {EmpresaId}", id, empresaId);
        await _authRealtimeNotifier.NotifyUserAuthChangedAsync(id, "AccountDeleted");

        return NoContent();
    }
}
