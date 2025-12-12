using FluentValidation;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Security;

namespace WebApplicationFlytwo.Validators;

public class UsuarioCreateRequestValidator : AbstractValidator<UsuarioCreateRequest>
{
    public UsuarioCreateRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress();

        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(6)
            .Matches(@"\d").WithMessage("Password must contain at least one digit.");

        RuleForEach(x => x.Roles)
            .NotEmpty()
            .When(x => x.Roles is not null);

        RuleForEach(x => x.Permissions)
            .NotEmpty()
            .Must(PermissionCatalog.IsKnown)
            .WithMessage("Unknown permission.")
            .When(x => x.Permissions is not null);

        RuleFor(x => x.FullName)
            .MaximumLength(200)
            .When(x => !string.IsNullOrWhiteSpace(x.FullName));
    }
}

