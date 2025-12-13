using FluentValidation;
using WebApplicationFlytwo.DTOs;

namespace WebApplicationFlytwo.Validators;

public class RegisterInviteRequestValidator : AbstractValidator<RegisterInviteRequest>
{
    public RegisterInviteRequestValidator()
    {
        RuleFor(x => x.Token)
            .NotEmpty();

        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(6)
            .Matches(@"\d").WithMessage("Password must contain at least one digit.");

        RuleFor(x => x.ConfirmPassword)
            .Equal(x => x.Password)
            .WithMessage("Passwords must match.");

        RuleFor(x => x.FullName)
            .MaximumLength(200)
            .When(x => !string.IsNullOrWhiteSpace(x.FullName));
    }
}

