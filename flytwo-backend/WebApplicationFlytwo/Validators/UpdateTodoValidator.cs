using FluentValidation;
using WebApplicationFlytwo.DTOs;

namespace WebApplicationFlytwo.Validators;

public class UpdateTodoValidator : AbstractValidator<UpdateTodoRequest>
{
    public UpdateTodoValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title is required")
            .MaximumLength(200).WithMessage("Title must not exceed 200 characters");

        RuleFor(x => x.Description)
            .MaximumLength(1000).WithMessage("Description must not exceed 1000 characters");
    }
}
