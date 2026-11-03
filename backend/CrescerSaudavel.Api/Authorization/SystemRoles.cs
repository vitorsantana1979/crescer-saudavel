namespace CrescerSaudavel.Api.Authorization;

public static class SystemRoles
{
    public const string SuperAdmin = "SuperAdmin";
    public const string AdminGrupo = "AdminGrupo";
    public const string AdminUnidade = "AdminUnidade";
    public const string Operador = "Operador";

    public const string Administradores = SuperAdmin + "," + AdminGrupo + "," + AdminUnidade;

    // Papéis que cada perfil pode atribuir e gerenciar: os mesmos que o cadastro de profissionais oferece.
    public static IReadOnlySet<string> AtribuiveisPor(Func<string, bool> estaNoPapel)
    {
        if (estaNoPapel(SuperAdmin))
            return new HashSet<string> { SuperAdmin, AdminGrupo, AdminUnidade, Operador };

        if (estaNoPapel(AdminGrupo))
            return new HashSet<string> { AdminGrupo, AdminUnidade, Operador };

        if (estaNoPapel(AdminUnidade))
            return new HashSet<string> { AdminUnidade, Operador };

        return new HashSet<string>();
    }
}
