using FluentAssertions;
using FluentValidation.TestHelper;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Security;
using WebApplicationFlytwo.Validators;

namespace WebApplicationFlytwo.Tests.Validators;

public class UsuarioCreateRequestValidatorTests
{
    private readonly UsuarioCreateRequestValidator _validator = new();

    [Fact]
    public void Validate_WithValidRequest_ShouldNotHaveErrors()
    {
        var request = new UsuarioCreateRequest
        {
            Email = "joao@empresa.com",
            Password = "Senha123",
            FullName = "João Silva",
            Roles = [ "User" ],
            Permissions = [ PermissionCatalog.Usuarios.Visualizar ]
        };

        var result = _validator.TestValidate(request);

        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_WithInvalidEmail_ShouldHaveError()
    {
        var request = new UsuarioCreateRequest
        {
            Email = "invalid",
            Password = "Senha123"
        };

        var result = _validator.TestValidate(request);

        result.ShouldHaveValidationErrorFor(x => x.Email);
    }

    [Fact]
    public void Validate_WithPasswordMissingDigit_ShouldHaveError()
    {
        var request = new UsuarioCreateRequest
        {
            Email = "joao@empresa.com",
            Password = "SenhaSemNumero"
        };

        var result = _validator.TestValidate(request);

        result.ShouldHaveValidationErrorFor(x => x.Password)
            .WithErrorMessage("Password must contain at least one digit.");
    }

    [Fact]
    public void Validate_WithUnknownPermission_ShouldHaveError()
    {
        var request = new UsuarioCreateRequest
        {
            Email = "joao@empresa.com",
            Password = "Senha123",
            Permissions = [ "Permissao.Inexistente" ]
        };

        var result = _validator.TestValidate(request);

        result.ShouldHaveValidationErrorFor("Permissions[0]")
            .WithErrorMessage("Unknown permission.");
    }
}

