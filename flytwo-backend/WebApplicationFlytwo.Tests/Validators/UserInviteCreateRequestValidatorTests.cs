using FluentAssertions;
using FluentValidation.TestHelper;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Security;
using WebApplicationFlytwo.Validators;

namespace WebApplicationFlytwo.Tests.Validators;

public class UserInviteCreateRequestValidatorTests
{
    private readonly UserInviteCreateRequestValidator _validator = new();

    [Fact]
    public void Validate_WithValidRequest_ShouldNotHaveErrors()
    {
        var request = new UserInviteCreateRequest
        {
            Email = "joao@empresa.com",
            ExpiresInDays = 7,
            Roles = [ "User" ],
            Permissions = [ PermissionCatalog.Usuarios.Visualizar ]
        };

        var result = _validator.TestValidate(request);

        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_WithInvalidEmail_ShouldHaveError()
    {
        var request = new UserInviteCreateRequest
        {
            Email = "invalid",
            ExpiresInDays = 7
        };

        var result = _validator.TestValidate(request);

        result.ShouldHaveValidationErrorFor(x => x.Email);
    }

    [Fact]
    public void Validate_WithExpiresOutOfRange_ShouldHaveError()
    {
        var request = new UserInviteCreateRequest
        {
            Email = "joao@empresa.com",
            ExpiresInDays = 0
        };

        var result = _validator.TestValidate(request);

        result.ShouldHaveValidationErrorFor(x => x.ExpiresInDays);
    }

    [Fact]
    public void Validate_WithUnknownPermission_ShouldHaveError()
    {
        var request = new UserInviteCreateRequest
        {
            Email = "joao@empresa.com",
            ExpiresInDays = 7,
            Permissions = [ "Permissao.Inexistente" ]
        };

        var result = _validator.TestValidate(request);

        result.ShouldHaveValidationErrorFor("Permissions[0]")
            .WithErrorMessage("Unknown permission.");
    }
}

