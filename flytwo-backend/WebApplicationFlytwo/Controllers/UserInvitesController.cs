using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Swashbuckle.AspNetCore.Annotations;
using WebApplicationFlytwo.Data;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Entities;
using WebApplicationFlytwo.Security;
using WebApplicationFlytwo.Services;

namespace WebApplicationFlytwo.Controllers;

[ApiController]
[Route("api/usuarios/convites")]
public class UserInvitesController : BaseApiController
{
    private readonly AppDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IConfiguration _configuration;
    private readonly IEmailSender _emailSender;
    private readonly IEmailTemplateRenderer _templateRenderer;
    private readonly ILogger<UserInvitesController> _logger;

    public UserInvitesController(
        AppDbContext context,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        IConfiguration configuration,
        IEmailSender emailSender,
        IEmailTemplateRenderer templateRenderer,
        ILogger<UserInvitesController> logger)
    {
        _context = context;
        _userManager = userManager;
        _roleManager = roleManager;
        _configuration = configuration;
        _emailSender = emailSender;
        _templateRenderer = templateRenderer;
        _logger = logger;
    }

    [HttpGet]
    [Authorize(Policy = PermissionCatalog.UsuariosConvites.Visualizar)]
    [SwaggerOperation(Summary = "Listar convites de usuários da empresa")]
    [ProducesResponseType(typeof(IEnumerable<UserInviteResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<UserInviteResponse>>> Listar()
    {
        if (EmpresaId is null)
            return Forbid();

        var invites = await _context.UserInvites
            .AsNoTracking()
            .Where(i => i.EmpresaId == EmpresaId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        var response = invites.Select(i => new UserInviteResponse
        {
            Id = i.Id,
            EmpresaId = i.EmpresaId,
            Email = i.Email,
            Roles = DeserializeStringArray(i.RolesJson),
            Permissions = DeserializeStringArray(i.PermissionsJson),
            CreatedAt = i.CreatedAt,
            ExpiresAt = i.ExpiresAt,
            RedeemedAt = i.RedeemedAt,
            RevokedAt = i.RevokedAt
        }).ToArray();

        return Ok(response);
    }

    [HttpPost]
    [Authorize(Policy = PermissionCatalog.UsuariosConvites.Criar)]
    [SwaggerOperation(Summary = "Criar convite para usuário (flow C)")]
    [ProducesResponseType(typeof(UserInviteCreateResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserInviteCreateResponse>> Criar([FromBody] UserInviteCreateRequest request)
    {
        if (EmpresaId is null || UserId is null)
            return Forbid();

        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser is not null)
            return Conflict(new { message = "User already exists." });

        var roles = (request.Roles ?? new[] { FlytwoRoles.User })
            .Select(r => r.Trim())
            .Where(r => !string.IsNullOrWhiteSpace(r))
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        foreach (var role in roles)
        {
            if (!await _roleManager.RoleExistsAsync(role))
                return BadRequest(new { message = $"Role '{role}' does not exist." });
        }

        var permissions = (request.Permissions ?? Array.Empty<string>())
            .Select(p => p.Trim())
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        var unknownPermissions = permissions.Where(p => !PermissionCatalog.IsKnown(p)).ToArray();
        if (unknownPermissions.Length > 0)
            return BadRequest(new { message = "Unknown permissions.", unknownPermissions });

        var token = InviteTokenService.GenerateToken();
        var tokenHash = InviteTokenService.ComputeHash(token);

        var now = DateTime.UtcNow;
        var expiresAt = now.AddDays(Math.Clamp(request.ExpiresInDays, 1, 30));

        var invite = new UserInvite
        {
            Id = Guid.NewGuid(),
            EmpresaId = EmpresaId.Value,
            Email = request.Email,
            TokenHash = tokenHash,
            RolesJson = roles.Length > 0 ? JsonSerializer.Serialize(roles) : null,
            PermissionsJson = permissions.Length > 0 ? JsonSerializer.Serialize(permissions) : null,
            CreatedByUserId = UserId,
            CreatedAt = now,
            ExpiresAt = expiresAt
        };

        _context.UserInvites.Add(invite);
        await _context.SaveChangesAsync();

        var inviteUrl = BuildInviteUrl(token);

        if (request.SendEmail)
        {
            var companyName = await _context.Empresas
                .Where(e => e.Id == EmpresaId)
                .Select(e => e.Name)
                .FirstOrDefaultAsync() ?? "FlyTwo";

            var placeholders = new Dictionary<string, string>
            {
                ["Email"] = request.Email,
                ["InviteUrl"] = inviteUrl,
                ["CompanyName"] = companyName,
                ["ExpiresAt"] = expiresAt.ToString("O"),
                ["AppName"] = "FlyTwo"
            };

            var body = await _templateRenderer.RenderAsync("user-invite", placeholders);
            await _emailSender.SendAsync(request.Email, "FlyTwo - Convite de acesso", body);
        }

        _logger.LogInformation("Invite {InviteId} created for {Email} in company {EmpresaId}", invite.Id, invite.Email, EmpresaId);

        var response = new UserInviteCreateResponse
        {
            Id = invite.Id,
            EmpresaId = invite.EmpresaId,
            Email = invite.Email,
            Roles = roles.OrderBy(x => x).ToArray(),
            Permissions = permissions.OrderBy(x => x).ToArray(),
            CreatedAt = invite.CreatedAt,
            ExpiresAt = invite.ExpiresAt,
            RedeemedAt = invite.RedeemedAt,
            RevokedAt = invite.RevokedAt,
            Token = token,
            InviteUrl = inviteUrl
        };

        return CreatedAtAction(nameof(Listar), new { }, response);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = PermissionCatalog.UsuariosConvites.Revogar)]
    [SwaggerOperation(Summary = "Revogar convite")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Revogar([FromRoute] Guid id)
    {
        if (EmpresaId is null || UserId is null)
            return Forbid();

        var invite = await _context.UserInvites.FirstOrDefaultAsync(i => i.Id == id && i.EmpresaId == EmpresaId);
        if (invite is null)
            return NotFound();

        if (invite.RedeemedAt is not null)
            return BadRequest(new { message = "Invite already redeemed." });

        if (invite.RevokedAt is not null)
            return NoContent();

        invite.RevokedAt = DateTime.UtcNow;
        invite.RevokedByUserId = UserId;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Invite {InviteId} revoked in company {EmpresaId}", invite.Id, EmpresaId);

        return NoContent();
    }

    private string BuildInviteUrl(string token)
    {
        var baseUrl = _configuration.GetValue<string>("Frontend:InviteUrl") ?? "http://localhost:5173/accept-invite";

        var separator = baseUrl.Contains('?') ? "&" : "?";
        return $"{baseUrl}{separator}token={Uri.EscapeDataString(token)}";
    }

    private static string[] DeserializeStringArray(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return Array.Empty<string>();

        try
        {
            var values = JsonSerializer.Deserialize<string[]>(json) ?? Array.Empty<string>();
            return values.Where(v => !string.IsNullOrWhiteSpace(v)).ToArray();
        }
        catch
        {
            return Array.Empty<string>();
        }
    }
}

