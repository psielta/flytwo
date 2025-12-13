using FluentValidation;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Entities;
using WebApplicationFlytwo.Services;

namespace WebApplicationFlytwo.Validators;

public class CreatePrintJobValidator : AbstractValidator<CreatePrintJobRequest>
{
    public CreatePrintJobValidator()
    {
        RuleFor(x => x.ReportKey)
            .NotEmpty().WithMessage("ReportKey is required")
            .MaximumLength(100).WithMessage("ReportKey must not exceed 100 characters")
            .Must(key => PrintReportKeys.All.Contains(key)).WithMessage("ReportKey is not supported");

        RuleFor(x => x.Format)
            .IsInEnum().WithMessage("Format is invalid");

        When(x => string.Equals(x.ReportKey, PrintReportKeys.WeatherForecast, StringComparison.OrdinalIgnoreCase), () =>
        {
            RuleFor(x => x.Parameters)
                .Must(p =>
                {
                    if (p is null)
                        return true;

                    var token = p["days"];
                    if (token is null)
                        return true;

                    if (!int.TryParse(token.ToString(), out var days))
                        return false;

                    return days is >= 1 and <= 30;
                })
                .WithMessage("WeatherForecast parameters: 'days' must be an integer between 1 and 30");
        });

        When(x => string.Equals(x.ReportKey, PrintReportKeys.Products, StringComparison.OrdinalIgnoreCase), () =>
        {
            RuleFor(x => x.Parameters)
                .Must(p =>
                {
                    if (p is null)
                        return true;

                    var onlyActive = p["onlyActive"];
                    if (onlyActive is not null && !bool.TryParse(onlyActive.ToString(), out _))
                        return false;

                    var category = p["category"];
                    if (category is not null && category.ToString().Length > 100)
                        return false;

                    return true;
                })
                .WithMessage("Products parameters: 'onlyActive' must be boolean and 'category' max length 100");
        });
    }
}

