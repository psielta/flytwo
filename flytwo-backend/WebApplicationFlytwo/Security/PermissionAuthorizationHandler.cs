using Microsoft.AspNetCore.Authorization;

namespace WebApplicationFlytwo.Security;

public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        if (context.User?.Identity?.IsAuthenticated != true)
            return Task.CompletedTask;

        // Admin bypasses permission checks (but not business rules like empresa isolation).
        if (context.User.IsInRole(FlytwoRoles.Admin))
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        var hasPermission = context.User.HasClaim(
            c => c.Type == FlytwoClaimTypes.Permission &&
                 c.Value == requirement.PermissionKey);

        if (hasPermission)
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}

