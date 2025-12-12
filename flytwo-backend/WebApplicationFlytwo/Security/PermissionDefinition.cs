namespace WebApplicationFlytwo.Security;

public sealed record PermissionDefinition(
    string Key,
    string Module,
    string Action,
    string Description
);

