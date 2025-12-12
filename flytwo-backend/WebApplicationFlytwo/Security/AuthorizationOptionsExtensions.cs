using Microsoft.AspNetCore.Authorization;

namespace WebApplicationFlytwo.Security;

public static class AuthorizationOptionsExtensions
{
    public static AuthorizationOptions AddFlytwoPolicies(this AuthorizationOptions options)
    {
        foreach (var permission in PermissionCatalog.All)
        {
            options.AddPolicy(permission.Key, policy =>
            {
                policy.RequireAuthenticatedUser();
                policy.Requirements.Add(new PermissionRequirement(permission.Key));
            });
        }

        return options;
    }
}

