using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using WebApplicationFlytwo.Security;

namespace WebApplicationFlytwo.Hubs;

public interface IAuthHubClient
{
    Task AuthChanged(AuthChangedMessage message);
}

public sealed record AuthChangedMessage(string Reason, DateTime OccurredAtUtc);

public static class AuthHubGroups
{
    public static string User(string userId) => $"user:{userId}";
    public static string Empresa(Guid empresaId) => $"empresa:{empresaId:D}";
}

[Authorize]
public sealed class AuthHub : Hub<IAuthHubClient>
{
    public override async Task OnConnectedAsync()
    {
        var userId =
            Context.User?.FindFirstValue(ClaimTypes.NameIdentifier) ??
            Context.User?.FindFirstValue(JwtRegisteredClaimNames.Sub);

        if (!string.IsNullOrWhiteSpace(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, AuthHubGroups.User(userId));
        }

        var rawEmpresaId = Context.User?.FindFirstValue(FlytwoClaimTypes.EmpresaId);
        if (Guid.TryParse(rawEmpresaId, out var empresaId) && empresaId != Guid.Empty)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, AuthHubGroups.Empresa(empresaId));
        }

        await base.OnConnectedAsync();
    }
}

