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

    public static class UsuariosConvites
    {
        public const string Visualizar = "Usuarios.Convites.Visualizar";
        public const string Criar = "Usuarios.Convites.Criar";
        public const string Revogar = "Usuarios.Convites.Revogar";
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
        ),
        new(
            Key: UsuariosConvites.Visualizar,
            Module: "Usuários",
            Action: "Visualizar convites",
            Description: "Permite visualizar convites de usuários da empresa."
        ),
        new(
            Key: UsuariosConvites.Criar,
            Module: "Usuários",
            Action: "Criar convites",
            Description: "Permite criar convites para usuários da empresa."
        ),
        new(
            Key: UsuariosConvites.Revogar,
            Module: "Usuários",
            Action: "Revogar convites",
            Description: "Permite revogar convites de usuários da empresa."
        )
    ];

    private static readonly HashSet<string> PermissionKeys = new(AllPermissions.Select(p => p.Key), StringComparer.Ordinal);

    public static IReadOnlyList<PermissionDefinition> All => AllPermissions;

    public static IReadOnlySet<string> Keys => PermissionKeys;

    public static bool IsKnown(string permissionKey) => PermissionKeys.Contains(permissionKey);
}
