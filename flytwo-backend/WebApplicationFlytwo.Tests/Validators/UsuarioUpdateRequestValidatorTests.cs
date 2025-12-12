using FluentValidation.TestHelper;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Validators;

namespace WebApplicationFlytwo.Tests.Validators;

public class UsuarioUpdateRequestValidatorTests
{
    private readonly UsuarioUpdateRequestValidator _validator = new();

    [Fact]
    public void Validate_WithOnlyFullName_ShouldNotHaveErrors()
    {
        var request = new UsuarioUpdateRequest
        {
            FullName = "João Silva"
        };

        var result = _validator.TestValidate(request);

        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_WithInvalidEmail_ShouldHaveError()
    {
        var request = new UsuarioUpdateRequest
        {
            Email = "invalid"
        };

        var result = _validator.TestValidate(request);

        result.ShouldHaveValidationErrorFor(x => x.Email);
    }

    [Fact]
    public void Validate_WithUnknownPermission_ShouldHaveError()
    {
        var request = new UsuarioUpdateRequest
        {
            Permissions = [ "Permissao.Inexistente" ]
        };

        var result = _validator.TestValidate(request);

        result.ShouldHaveValidationErrorFor("Permissions[0]")
            .WithErrorMessage("Unknown permission.");
    }
}

