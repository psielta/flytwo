using FluentValidation;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Security;

namespace WebApplicationFlytwo.Validators;

public class UsuarioUpdateRequestValidator : AbstractValidator<UsuarioUpdateRequest>
{
    public UsuarioUpdateRequestValidator()
    {
        RuleFor(x => x.Email)
            .EmailAddress()
            .When(x => !string.IsNullOrWhiteSpace(x.Email));

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
            .When(x => x.FullName is not null);
    }
}

