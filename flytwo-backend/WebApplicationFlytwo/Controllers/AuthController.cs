using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Swashbuckle.AspNetCore.Annotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using WebApplicationFlytwo.Data;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Entities;
using WebApplicationFlytwo.Security;
using WebApplicationFlytwo.Services;

namespace WebApplicationFlytwo.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : BaseApiController
{
    private readonly AppDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IRefreshTokenService _refreshTokenService;
    private readonly IConfiguration _configuration;
    private readonly IEmailSender _emailSender;
    private readonly IEmailTemplateRenderer _templateRenderer;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<AuthController> _logger;

    private const string DefaultUserRole = FlytwoRoles.User;

    public AuthController(
        AppDbContext context,
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        RoleManager<IdentityRole> roleManager,
        IJwtTokenService jwtTokenService,
        IRefreshTokenService refreshTokenService,
        IConfiguration configuration,
        IEmailSender emailSender,
        IEmailTemplateRenderer templateRenderer,
        IWebHostEnvironment env,
        ILogger<AuthController> logger)
    {
        _context = context;
        _userManager = userManager;
        _signInManager = signInManager;
        _roleManager = roleManager;
        _jwtTokenService = jwtTokenService;
        _refreshTokenService = refreshTokenService;
        _configuration = configuration;
        _emailSender = emailSender;
        _templateRenderer = templateRenderer;
        _env = env;
        _logger = logger;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    [SwaggerOperation(Summary = "Public registration is disabled (use invites / admin-managed users)")]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
    {
        _logger.LogWarning("Public registration attempted for {Email}", request.Email);
        return Task.FromResult<ActionResult<AuthResponse>>(BadRequest(new { message = "Public registration is disabled. Ask an admin for an invite." }));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [SwaggerOperation(Summary = "Authenticate user and return JWT token")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        _logger.LogInformation("User {Email} attempting to login", request.Email);

        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            _logger.LogWarning("Login failed for {Email}: user not found", request.Email);
            return Unauthorized(new { message = "Invalid credentials." });
        }

        if (user.EmpresaId == Guid.Empty)
        {
            _logger.LogWarning("Login blocked for {Email}: user has no company (EmpresaId is empty)", request.Email);
            return Unauthorized(new { message = "User is not associated with a company." });
        }

        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: false);
        if (!result.Succeeded)
        {
            _logger.LogWarning("Login failed for {Email}: invalid password", request.Email);
            return Unauthorized(new { message = "Invalid credentials." });
        }

        var roles = await _userManager.GetRolesAsync(user);
        var token = await _jwtTokenService.GenerateTokenAsync(user);
        var expiresAt = DateTime.UtcNow.AddMinutes(_configuration.GetValue<double?>("Jwt:ExpiryMinutes") ?? 60);
        var refresh = await _refreshTokenService.IssueAsync(user.Id, GetIpAddress());
        var permissions = (await _userManager.GetClaimsAsync(user))
            .Where(c => c.Type == FlytwoClaimTypes.Permission)
            .Select(c => c.Value)
            .Distinct()
            .OrderBy(x => x)
            .ToArray();

        var response = new AuthResponse
        {
            AccessToken = token,
            ExpiresAt = expiresAt,
            RefreshToken = refresh.RefreshToken,
            RefreshTokenExpiresAt = refresh.ExpiresAt,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            EmpresaId = user.EmpresaId,
            Roles = roles,
            Permissions = permissions
        };

        return Ok(response);
    }

    [HttpGet("me")]
    [Authorize]
    [SwaggerOperation(Summary = "Returns authenticated user info (no DB hit unless needed)")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<object>> Me()
    {
        var user = await GetCurrentUserAsync(_userManager);
        if (user == null)
        {
            return Unauthorized();
        }

        var roles = await _userManager.GetRolesAsync(user);
        var permissions = User.Claims
            .Where(c => c.Type == FlytwoClaimTypes.Permission)
            .Select(c => c.Value)
            .Distinct()
            .OrderBy(x => x)
            .ToArray();
        return Ok(new
        {
            user.Email,
            user.FullName,
            user.EmpresaId,
            Roles = roles,
            Permissions = permissions
        });
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [SwaggerOperation(Summary = "Generate a password reset token and email it to the user")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            // Do not reveal existence; returning 200 but log for audit
            _logger.LogWarning("Password reset requested for non-existing user {Email}", request.Email);
            return Ok();
        }

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var resetBaseUrl = _configuration.GetValue<string>("Frontend:ResetPasswordUrl") ?? "http://localhost:5173/reset-password";
        var encodedToken = Uri.EscapeDataString(token);
        var resetLink = $"{resetBaseUrl}?email={Uri.EscapeDataString(user.Email ?? string.Empty)}&token={encodedToken}";

        var placeholders = new Dictionary<string, string>
        {
            ["FullName"] = user.FullName ?? user.Email ?? "usuário",
            ["Email"] = user.Email ?? string.Empty,
            ["ResetLink"] = resetLink,
            ["ResetToken"] = token,
            ["AppName"] = "FlyTwo"
        };

        var body = await _templateRenderer.RenderAsync("reset-password", placeholders);

        await _emailSender.SendAsync(user.Email!, "FlyTwo - Redefinir senha", body);

        _logger.LogInformation("Password reset email sent to {Email}", request.Email);
        return Ok();
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    [SwaggerOperation(Summary = "Reset password using token sent via email")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            _logger.LogWarning("Password reset attempted for non-existing user {Email}", request.Email);
            return Ok(); // don't reveal existence
        }

        var result = await _userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });
        }

        _logger.LogInformation("Password reset completed for {Email}", request.Email);
        return NoContent();
    }

    [HttpGet("invite-preview")]
    [AllowAnonymous]
    [SwaggerOperation(Summary = "Preview invitation details by token (flow C)")]
    [ProducesResponseType(typeof(UserInvitePreviewResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<UserInvitePreviewResponse>> InvitePreview([FromQuery] string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest(new { message = "Token is required." });

        var tokenHash = InviteTokenService.ComputeHash(token);
        var invite = await _context.UserInvites
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.TokenHash == tokenHash);

        if (invite is null)
            return NotFound();

        var now = DateTime.UtcNow;
        if (invite.RevokedAt is not null)
            return BadRequest(new { message = "Invite revoked." });
        if (invite.RedeemedAt is not null)
            return BadRequest(new { message = "Invite already redeemed." });
        if (invite.ExpiresAt <= now)
            return BadRequest(new { message = "Invite expired." });

        var companyName = await _context.Empresas
            .AsNoTracking()
            .Where(e => e.Id == invite.EmpresaId)
            .Select(e => e.Name)
            .FirstOrDefaultAsync() ?? "FlyTwo";

        return Ok(new UserInvitePreviewResponse
        {
            Email = invite.Email,
            CompanyName = companyName,
            Roles = DeserializeStringArray(invite.RolesJson),
            Permissions = DeserializeStringArray(invite.PermissionsJson),
            ExpiresAt = invite.ExpiresAt
        });
    }

    [HttpPost("register-invite")]
    [AllowAnonymous]
    [SwaggerOperation(Summary = "Register a new user using an invite token (flow C)")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AuthResponse>> RegisterInvite([FromBody] RegisterInviteRequest request)
    {
        var tokenHash = InviteTokenService.ComputeHash(request.Token);
        var now = DateTime.UtcNow;

        await using var tx = await _context.Database.BeginTransactionAsync();

        var invite = await _context.UserInvites.FirstOrDefaultAsync(i => i.TokenHash == tokenHash);
        if (invite is null)
            return NotFound();

        if (invite.RevokedAt is not null)
            return BadRequest(new { message = "Invite revoked." });
        if (invite.RedeemedAt is not null)
            return BadRequest(new { message = "Invite already redeemed." });
        if (invite.ExpiresAt <= now)
            return BadRequest(new { message = "Invite expired." });

        var existingUser = await _userManager.FindByEmailAsync(invite.Email);
        if (existingUser is not null)
            return Conflict(new { message = "User already exists." });

        var roles = DeserializeStringArray(invite.RolesJson);
        if (roles.Length == 0)
            roles = new[] { DefaultUserRole };

        foreach (var role in roles)
        {
            if (!await _roleManager.RoleExistsAsync(role))
            {
                return BadRequest(new { message = $"Role '{role}' does not exist." });
            }
        }

        var permissions = DeserializeStringArray(invite.PermissionsJson)
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        var unknownPermissions = permissions.Where(p => !PermissionCatalog.IsKnown(p)).ToArray();
        if (unknownPermissions.Length > 0)
        {
            return BadRequest(new { message = "Unknown permissions.", unknownPermissions });
        }

        var user = new ApplicationUser
        {
            UserName = invite.Email,
            Email = invite.Email,
            FullName = request.FullName,
            EmpresaId = invite.EmpresaId,
            EmailConfirmed = true
        };

        var createResult = await _userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            return BadRequest(new { errors = createResult.Errors.Select(e => e.Description) });
        }

        var addRolesResult = await _userManager.AddToRolesAsync(user, roles);
        if (!addRolesResult.Succeeded)
        {
            return BadRequest(new { errors = addRolesResult.Errors.Select(e => e.Description) });
        }

        if (permissions.Length > 0)
        {
            var permissionClaims = permissions.Select(p => new Claim(FlytwoClaimTypes.Permission, p)).ToArray();
            var addClaimsResult = await _userManager.AddClaimsAsync(user, permissionClaims);
            if (!addClaimsResult.Succeeded)
            {
                return BadRequest(new { errors = addClaimsResult.Errors.Select(e => e.Description) });
            }
        }

        invite.RedeemedAt = now;
        invite.RedeemedByUserId = user.Id;
        await _context.SaveChangesAsync();

        await tx.CommitAsync();

        var token = await _jwtTokenService.GenerateTokenAsync(user);
        var expiresAt = DateTime.UtcNow.AddMinutes(_configuration.GetValue<double?>("Jwt:ExpiryMinutes") ?? 60);
        var refresh = await _refreshTokenService.IssueAsync(user.Id, GetIpAddress());

        return CreatedAtAction(nameof(Me), new { }, new AuthResponse
        {
            AccessToken = token,
            ExpiresAt = expiresAt,
            RefreshToken = refresh.RefreshToken,
            RefreshTokenExpiresAt = refresh.ExpiresAt,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            EmpresaId = user.EmpresaId,
            Roles = roles,
            Permissions = permissions
        });
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    [SwaggerOperation(Summary = "Rotate refresh token and return a new JWT access token")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponse>> Refresh([FromBody] RefreshRequest request)
    {
        var rotate = await _refreshTokenService.RotateAsync(request.RefreshToken, GetIpAddress());
        if (rotate is null)
            return Unauthorized(new { message = "Invalid refresh token." });

        var user = await _userManager.FindByIdAsync(rotate.UserId);
        if (user is null || user.EmpresaId == Guid.Empty)
            return Unauthorized(new { message = "Invalid refresh token." });

        var roles = await _userManager.GetRolesAsync(user);
        var token = await _jwtTokenService.GenerateTokenAsync(user);
        var expiresAt = DateTime.UtcNow.AddMinutes(_configuration.GetValue<double?>("Jwt:ExpiryMinutes") ?? 60);

        var permissions = (await _userManager.GetClaimsAsync(user))
            .Where(c => c.Type == FlytwoClaimTypes.Permission)
            .Select(c => c.Value)
            .Distinct()
            .OrderBy(x => x)
            .ToArray();

        return Ok(new AuthResponse
        {
            AccessToken = token,
            ExpiresAt = expiresAt,
            RefreshToken = rotate.RefreshToken,
            RefreshTokenExpiresAt = rotate.ExpiresAt,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            EmpresaId = user.EmpresaId,
            Roles = roles,
            Permissions = permissions
        });
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    [SwaggerOperation(Summary = "Revoke refresh token (or revoke all tokens for the authenticated user)")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest request)
    {
        var ip = GetIpAddress();

        if (!string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            await _refreshTokenService.RevokeAsync(request.RefreshToken, ip);
            return NoContent();
        }

        if (UserId is not null)
        {
            await _refreshTokenService.RevokeAllAsync(UserId, ip);
        }

        return NoContent();
    }

    private string? GetIpAddress()
    {
        return HttpContext?.Connection?.RemoteIpAddress?.ToString();
    }

    private static string[] DeserializeStringArray(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return Array.Empty<string>();

        try
        {
            var values = JsonSerializer.Deserialize<string[]>(json) ?? Array.Empty<string>();
            return values
                .Select(v => v?.Trim())
                .Where(v => !string.IsNullOrWhiteSpace(v))
                .Select(v => v!)
                .Distinct(StringComparer.Ordinal)
                .ToArray();
        }
        catch
        {
            return Array.Empty<string>();
        }
    }
}
