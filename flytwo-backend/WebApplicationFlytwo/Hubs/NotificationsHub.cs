using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using WebApplicationFlytwo.Entities;
using WebApplicationFlytwo.Security;

namespace WebApplicationFlytwo.Hubs;

public interface INotificationsHubClient
{
    Task NotificationPushed(NotificationPushedMessage message);
}

public sealed record NotificationPushedMessage(
    Guid Id,
    NotificationScope Scope,
    Guid? EmpresaId,
    string? TargetUserId,
    string Title,
    string Message,
    string? Category,
    int? Severity,
    DateTime CreatedAtUtc);

public static class NotificationsHubGroups
{
    public const string System = "system";
    public static string User(string userId) => $"user:{userId}";
    public static string Empresa(Guid empresaId) => $"empresa:{empresaId:D}";
}

[Authorize]
public sealed class NotificationsHub : Hub<INotificationsHubClient>
{
    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, NotificationsHubGroups.System);

        var userId =
            Context.User?.FindFirstValue(ClaimTypes.NameIdentifier) ??
            Context.User?.FindFirstValue(JwtRegisteredClaimNames.Sub);

        if (!string.IsNullOrWhiteSpace(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, NotificationsHubGroups.User(userId));
        }

        var rawEmpresaId = Context.User?.FindFirstValue(FlytwoClaimTypes.EmpresaId);
        if (Guid.TryParse(rawEmpresaId, out var empresaId) && empresaId != Guid.Empty)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, NotificationsHubGroups.Empresa(empresaId));
        }

        await base.OnConnectedAsync();
    }
}

