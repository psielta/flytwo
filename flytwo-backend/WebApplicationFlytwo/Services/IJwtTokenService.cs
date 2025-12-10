using WebApplicationFlytwo.Entities;

namespace WebApplicationFlytwo.Services;

public interface IJwtTokenService
{
    Task<string> GenerateTokenAsync(ApplicationUser user);
}
