namespace WebApplicationFlytwo.Security;

public static class FlytwoRoles
{
    public const string Admin = "Admin";
    public const string Gerente = "Gerente";
    public const string User = "User";

    public static readonly string[] All = { Admin, Gerente, User };
}

