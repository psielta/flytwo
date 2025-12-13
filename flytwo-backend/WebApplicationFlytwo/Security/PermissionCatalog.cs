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

    public static class Produtos
    {
        public const string Visualizar = "Produtos.Visualizar";
        public const string Criar = "Produtos.Criar";
        public const string Editar = "Produtos.Editar";
        public const string Excluir = "Produtos.Excluir";
    }

    public static class Todos
    {
        public const string Visualizar = "Todos.Visualizar";
        public const string Criar = "Todos.Criar";
        public const string Editar = "Todos.Editar";
        public const string Excluir = "Todos.Excluir";
    }

    public static class Notificacoes
    {
        public const string Visualizar = "Notificacoes.Visualizar";
        public const string Criar = "Notificacoes.Criar";
    }

    public static class Relatorios
    {
        public const string Visualizar = "Relatorios.Visualizar";
        public const string Gerar = "Relatorios.Gerar";
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
        ),
        new(
            Key: Produtos.Visualizar,
            Module: "Produtos",
            Action: "Visualizar",
            Description: "Permite visualizar produtos da empresa."
        ),
        new(
            Key: Produtos.Criar,
            Module: "Produtos",
            Action: "Criar",
            Description: "Permite criar produtos na empresa."
        ),
        new(
            Key: Produtos.Editar,
            Module: "Produtos",
            Action: "Editar",
            Description: "Permite editar produtos da empresa."
        ),
        new(
            Key: Produtos.Excluir,
            Module: "Produtos",
            Action: "Excluir",
            Description: "Permite excluir produtos da empresa."
        ),
        new(
            Key: Todos.Visualizar,
            Module: "Todos",
            Action: "Visualizar",
            Description: "Permite visualizar todos da empresa."
        ),
        new(
            Key: Todos.Criar,
            Module: "Todos",
            Action: "Criar",
            Description: "Permite criar todos na empresa."
        ),
        new(
            Key: Todos.Editar,
            Module: "Todos",
            Action: "Editar",
            Description: "Permite editar todos da empresa."
        ),
        new(
            Key: Todos.Excluir,
            Module: "Todos",
            Action: "Excluir",
            Description: "Permite excluir todos da empresa."
        ),
        new(
            Key: Notificacoes.Visualizar,
            Module: "Notificacoes",
            Action: "Visualizar",
            Description: "Permite visualizar notificacoes (inbox)."
        ),
        new(
            Key: Notificacoes.Criar,
            Module: "Notificacoes",
            Action: "Criar",
            Description: "Permite criar notificacoes."
        ),
        new(
            Key: Relatorios.Visualizar,
            Module: "Relatorios",
            Action: "Visualizar",
            Description: "Permite visualizar jobs e status de relatorios."
        ),
        new(
            Key: Relatorios.Gerar,
            Module: "Relatorios",
            Action: "Gerar",
            Description: "Permite gerar relatorios (criar jobs)."
        )
    ];

    private static readonly HashSet<string> PermissionKeys = new(AllPermissions.Select(p => p.Key), StringComparer.Ordinal);

    public static IReadOnlyList<PermissionDefinition> All => AllPermissions;

    public static IReadOnlySet<string> Keys => PermissionKeys;

    public static bool IsKnown(string permissionKey) => PermissionKeys.Contains(permissionKey);
}
