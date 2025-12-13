namespace WebApplicationFlytwo.Services;

public interface IAuthRealtimeNotifier
{
    Task NotifyUserAuthChangedAsync(string userId, string reason);
}

