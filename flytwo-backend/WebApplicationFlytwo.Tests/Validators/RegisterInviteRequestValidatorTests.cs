using FluentAssertions;
using FluentValidation.TestHelper;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Validators;

namespace WebApplicationFlytwo.Tests.Validators;

public class RegisterInviteRequestValidatorTests
{
    private readonly RegisterInviteRequestValidator _validator = new();

    [Fact]
    public void Validate_WithValidRequest_ShouldNotHaveErrors()
    {
        var request = new RegisterInviteRequest
        {
            Token = "token",
            Password = "Senha123",
            ConfirmPassword = "Senha123",
            FullName = "João Silva"
        };

        var result = _validator.TestValidate(request);

        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_WithMissingToken_ShouldHaveError()
    {
        var request = new RegisterInviteRequest
        {
            Token = "",
            Password = "Senha123",
            ConfirmPassword = "Senha123"
        };

        var result = _validator.TestValidate(request);

        result.ShouldHaveValidationErrorFor(x => x.Token);
    }

    [Fact]
    public void Validate_WithMismatchedPasswords_ShouldHaveError()
    {
        var request = new RegisterInviteRequest
        {
            Token = "token",
            Password = "Senha123",
            ConfirmPassword = "Senha456"
        };

        var result = _validator.TestValidate(request);

        result.ShouldHaveValidationErrorFor(x => x.ConfirmPassword)
            .WithErrorMessage("Passwords must match.");
    }

    [Fact]
    public void Validate_WithPasswordMissingDigit_ShouldHaveError()
    {
        var request = new RegisterInviteRequest
        {
            Token = "token",
            Password = "SenhaSemNumero",
            ConfirmPassword = "SenhaSemNumero"
        };

        var result = _validator.TestValidate(request);

        result.ShouldHaveValidationErrorFor(x => x.Password)
            .WithErrorMessage("Password must contain at least one digit.");
    }
}

