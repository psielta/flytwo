using FluentValidation;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Entities;

namespace WebApplicationFlytwo.Validators;

public class CreateNotificationValidator : AbstractValidator<CreateNotificationRequest>
{
    public CreateNotificationValidator()
    {
        RuleFor(x => x.Scope)
            .IsInEnum()
            .WithMessage("Scope is invalid");

        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title is required")
            .MaximumLength(200).WithMessage("Title must not exceed 200 characters");

        RuleFor(x => x.Message)
            .NotEmpty().WithMessage("Message is required")
            .MaximumLength(4000).WithMessage("Message must not exceed 4000 characters");

        RuleFor(x => x.Category)
            .MaximumLength(100).WithMessage("Category must not exceed 100 characters")
            .When(x => !string.IsNullOrWhiteSpace(x.Category));

        RuleFor(x => x.TargetUserId)
            .MaximumLength(450).WithMessage("TargetUserId must not exceed 450 characters")
            .When(x => !string.IsNullOrWhiteSpace(x.TargetUserId));

        RuleFor(x => x.Severity)
            .GreaterThanOrEqualTo(0).WithMessage("Severity must be 0 or greater")
            .When(x => x.Severity.HasValue);

        When(x => x.Scope == NotificationScope.Empresa, () =>
        {
            RuleFor(x => x.EmpresaId)
                .Must(id => id is null || id != Guid.Empty).WithMessage("EmpresaId must not be empty");

            RuleFor(x => x.TargetUserId)
                .Null().WithMessage("TargetUserId must be null when scope is Empresa");
        });

        When(x => x.Scope == NotificationScope.Usuario, () =>
        {
            RuleFor(x => x.TargetUserId)
                .NotEmpty().WithMessage("TargetUserId is required when scope is Usuario")
                .MaximumLength(450).WithMessage("TargetUserId must not exceed 450 characters");

            RuleFor(x => x.EmpresaId)
                .Null().WithMessage("EmpresaId must be null when scope is Usuario");
        });

        When(x => x.Scope == NotificationScope.System, () =>
        {
            RuleFor(x => x.EmpresaId)
                .Null().WithMessage("EmpresaId must be null when scope is System");

            RuleFor(x => x.TargetUserId)
                .Null().WithMessage("TargetUserId must be null when scope is System");
        });
    }
}
