using FluentValidation;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Security;

namespace WebApplicationFlytwo.Validators;

public class UserInviteCreateRequestValidator : AbstractValidator<UserInviteCreateRequest>
{
    public UserInviteCreateRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress();

        RuleFor(x => x.ExpiresInDays)
            .InclusiveBetween(1, 30);

        RuleForEach(x => x.Roles)
            .NotEmpty()
            .When(x => x.Roles is not null);

        RuleForEach(x => x.Permissions)
            .NotEmpty()
            .Must(PermissionCatalog.IsKnown)
            .WithMessage("Unknown permission.")
            .When(x => x.Permissions is not null);
    }
}

