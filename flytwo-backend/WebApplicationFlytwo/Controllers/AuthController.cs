using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Entities;
using WebApplicationFlytwo.Services;

namespace WebApplicationFlytwo.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IConfiguration _configuration;
    private readonly IEmailSender _emailSender;
    private readonly IEmailTemplateRenderer _templateRenderer;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<AuthController> _logger;

    private const string DefaultUserRole = "User";

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        RoleManager<IdentityRole> roleManager,
        IJwtTokenService jwtTokenService,
        IConfiguration configuration,
        IEmailSender emailSender,
        IEmailTemplateRenderer templateRenderer,
        IWebHostEnvironment env,
        ILogger<AuthController> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _roleManager = roleManager;
        _jwtTokenService = jwtTokenService;
        _configuration = configuration;
        _emailSender = emailSender;
        _templateRenderer = templateRenderer;
        _env = env;
        _logger = logger;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    [SwaggerOperation(Summary = "Register a new user and return a JWT token")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
    {
        _logger.LogInformation("Registering user {Email}", request.Email);

        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
        {
            return Conflict(new { message = "User already exists." });
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName
        };

        var createResult = await _userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            return BadRequest(new { errors = createResult.Errors.Select(e => e.Description) });
        }

        // Ensure default role exists and assign
        if (!await _roleManager.RoleExistsAsync(DefaultUserRole))
        {
            await _roleManager.CreateAsync(new IdentityRole(DefaultUserRole));
        }
        await _userManager.AddToRoleAsync(user, DefaultUserRole);

        var token = await _jwtTokenService.GenerateTokenAsync(user);
        var expiresAt = DateTime.UtcNow.AddMinutes(_configuration.GetValue<double?>("Jwt:ExpiryMinutes") ?? 60);
        var roles = new[] { DefaultUserRole };

        var response = new AuthResponse
        {
            AccessToken = token,
            ExpiresAt = expiresAt,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            Roles = roles
        };

        return CreatedAtAction(nameof(Me), new { }, response);
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

        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: false);
        if (!result.Succeeded)
        {
            _logger.LogWarning("Login failed for {Email}: invalid password", request.Email);
            return Unauthorized(new { message = "Invalid credentials." });
        }

        var roles = await _userManager.GetRolesAsync(user);
        var token = await _jwtTokenService.GenerateTokenAsync(user);
        var expiresAt = DateTime.UtcNow.AddMinutes(_configuration.GetValue<double?>("Jwt:ExpiryMinutes") ?? 60);

        var response = new AuthResponse
        {
            AccessToken = token,
            ExpiresAt = expiresAt,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            Roles = roles
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
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (userId == null)
        {
            return Unauthorized();
        }

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return Unauthorized();
        }

        var roles = await _userManager.GetRolesAsync(user);
        return Ok(new
        {
            user.Email,
            user.FullName,
            Roles = roles
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
}
