using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace WebApplicationFlytwo.Hubs;

public interface IPrintHubClient
{
    Task PrintJobProgress(PrintJobProgressMessage message);
}

public sealed record PrintJobProgressMessage(
    Guid JobId,
    string Status,
    int? Current,
    int? Total,
    string? Message,
    int? Percent,
    string? OutputUrl,
    DateTime? OutputExpiresAtUtc,
    string? ErrorMessage,
    DateTime OccurredAtUtc);

public static class PrintHubGroups
{
    public static string User(string userId) => $"user:{userId}";
}

[Authorize]
public sealed class PrintHub : Hub<IPrintHubClient>
{
    public override async Task OnConnectedAsync()
    {
        var userId =
            Context.User?.FindFirstValue(ClaimTypes.NameIdentifier) ??
            Context.User?.FindFirstValue(JwtRegisteredClaimNames.Sub);

        if (!string.IsNullOrWhiteSpace(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, PrintHubGroups.User(userId));
        }

        await base.OnConnectedAsync();
    }
}

