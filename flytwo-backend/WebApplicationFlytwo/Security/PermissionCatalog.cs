namespace WebApplicationFlytwo.Security;

public static class PermissionCatalog
{
    public static class Usuarios
    {
        public const string Visualizar = "Usuarios.Visualizar";
        public const string Criar = "Usuarios.Criar";
        public const string Editar = "Usuarios.Editar";
        public const string Excluir = "Usuarios.Excluir";
    }

    private static readonly PermissionDefinition[] AllPermissions =
    [
        new(
            Key: Usuarios.Visualizar,
            Module: "Usuários",
            Action: "Visualizar",
            Description: "Permite visualizar usuários da empresa."
        ),
        new(
            Key: Usuarios.Criar,
            Module: "Usuários",
            Action: "Criar",
            Description: "Permite criar usuários na empresa."
        ),
        new(
            Key: Usuarios.Editar,
            Module: "Usuários",
            Action: "Editar",
            Description: "Permite editar usuários da empresa."
        ),
        new(
            Key: Usuarios.Excluir,
            Module: "Usuários",
            Action: "Excluir",
            Description: "Permite excluir usuários da empresa."
        )
    ];

    private static readonly HashSet<string> PermissionKeys = new(AllPermissions.Select(p => p.Key), StringComparer.Ordinal);

    public static IReadOnlyList<PermissionDefinition> All => AllPermissions;

    public static IReadOnlySet<string> Keys => PermissionKeys;

    public static bool IsKnown(string permissionKey) => PermissionKeys.Contains(permissionKey);
}

