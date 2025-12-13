using Microsoft.AspNetCore.SignalR;
using WebApplicationFlytwo.Hubs;

namespace WebApplicationFlytwo.Services;

public sealed class AuthRealtimeNotifier : IAuthRealtimeNotifier
{
    private readonly IHubContext<AuthHub, IAuthHubClient> _hubContext;

    public AuthRealtimeNotifier(IHubContext<AuthHub, IAuthHubClient> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task NotifyUserAuthChangedAsync(string userId, string reason)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Task.CompletedTask;

        return _hubContext.Clients
            .Group(AuthHubGroups.User(userId))
            .AuthChanged(new AuthChangedMessage(reason, DateTime.UtcNow));
    }
}

