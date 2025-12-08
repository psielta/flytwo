using FluentAssertions;
using FluentValidation.TestHelper;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Validators;

namespace WebApplicationFlytwo.Tests.Validators;

public class CreateTodoValidatorTests
{
    private readonly CreateTodoValidator _validator = new();

    [Fact]
    public void Validate_WithValidRequest_ShouldNotHaveErrors()
    {
        // Arrange
        var request = new CreateTodoRequest
        {
            Title = "Valid Title",
            Description = "Valid Description"
        };

        // Act
        var result = _validator.TestValidate(request);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_WithEmptyTitle_ShouldHaveError()
    {
        // Arrange
        var request = new CreateTodoRequest
        {
            Title = string.Empty,
            Description = "Valid Description"
        };

        // Act
        var result = _validator.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Title)
              .WithErrorMessage("Title is required");
    }

    [Fact]
    public void Validate_WithNullTitle_ShouldHaveError()
    {
        // Arrange
        var request = new CreateTodoRequest
        {
            Title = null!,
            Description = "Valid Description"
        };

        // Act
        var result = _validator.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Title);
    }

    [Fact]
    public void Validate_WithWhitespaceTitle_ShouldHaveError()
    {
        // Arrange
        var request = new CreateTodoRequest
        {
            Title = "   ",
            Description = "Valid Description"
        };

        // Act
        var result = _validator.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Title)
              .WithErrorMessage("Title is required");
    }

    [Fact]
    public void Validate_WithTitleExceeding200Chars_ShouldHaveError()
    {
        // Arrange
        var request = new CreateTodoRequest
        {
            Title = new string('a', 201),
            Description = "Valid Description"
        };

        // Act
        var result = _validator.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Title)
              .WithErrorMessage("Title must not exceed 200 characters");
    }

    [Fact]
    public void Validate_WithTitleExactly200Chars_ShouldNotHaveError()
    {
        // Arrange
        var request = new CreateTodoRequest
        {
            Title = new string('a', 200),
            Description = "Valid Description"
        };

        // Act
        var result = _validator.TestValidate(request);

        // Assert
        result.ShouldNotHaveValidationErrorFor(x => x.Title);
    }

    [Fact]
    public void Validate_WithNullDescription_ShouldNotHaveError()
    {
        // Arrange
        var request = new CreateTodoRequest
        {
            Title = "Valid Title",
            Description = null
        };

        // Act
        var result = _validator.TestValidate(request);

        // Assert
        result.ShouldNotHaveValidationErrorFor(x => x.Description);
    }

    [Fact]
    public void Validate_WithEmptyDescription_ShouldNotHaveError()
    {
        // Arrange
        var request = new CreateTodoRequest
        {
            Title = "Valid Title",
            Description = string.Empty
        };

        // Act
        var result = _validator.TestValidate(request);

        // Assert
        result.ShouldNotHaveValidationErrorFor(x => x.Description);
    }

    [Fact]
    public void Validate_WithDescriptionExceeding1000Chars_ShouldHaveError()
    {
        // Arrange
        var request = new CreateTodoRequest
        {
            Title = "Valid Title",
            Description = new string('a', 1001)
        };

        // Act
        var result = _validator.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Description)
              .WithErrorMessage("Description must not exceed 1000 characters");
    }

    [Fact]
    public void Validate_WithDescriptionExactly1000Chars_ShouldNotHaveError()
    {
        // Arrange
        var request = new CreateTodoRequest
        {
            Title = "Valid Title",
            Description = new string('a', 1000)
        };

        // Act
        var result = _validator.TestValidate(request);

        // Assert
        result.ShouldNotHaveValidationErrorFor(x => x.Description);
    }
}
