using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using WebApplicationFlytwo.Controllers;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Entities;
using WebApplicationFlytwo.Services;
using WebApplicationFlytwo.Tests.Fixtures;

namespace WebApplicationFlytwo.Tests.Controllers;

public class PrintControllerTests : IClassFixture<TestFixture>
{
    private readonly TestFixture _fixture;

    public PrintControllerTests(TestFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task CreateJob_ReturnsAcceptedAndCreatesJob()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var serviceLogger = _fixture.CreateLogger<PrintJobService>();
        var service = new PrintJobService(context, serviceLogger.Object);
        var controllerLogger = _fixture.CreateLogger<PrintController>();

        var controller = new PrintController(service, controllerLogger.Object);
        _fixture.SetAuthenticatedUser(controller, userId: "user-1");

        var request = new CreatePrintJobRequest
        {
            ReportKey = PrintReportKeys.WeatherForecast,
            Format = PrintJobFormat.Pdf
        };

        // Act
        var result = await controller.CreateJob(request);

        // Assert
        result.Result.Should().BeOfType<AcceptedAtActionResult>();
        context.PrintJobs.Should().HaveCount(1);
        context.OutboxMessages.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetJob_ReturnsNotFound_ForOtherUser()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var serviceLogger = _fixture.CreateLogger<PrintJobService>();
        var service = new PrintJobService(context, serviceLogger.Object);

        var created = await service.CreateJobAsync(
            "user-1",
            TestFixture.DefaultEmpresaId,
            new CreatePrintJobRequest { ReportKey = PrintReportKeys.WeatherForecast, Format = PrintJobFormat.Pdf });

        var controllerLogger = _fixture.CreateLogger<PrintController>();
        var controller = new PrintController(service, controllerLogger.Object);
        _fixture.SetAuthenticatedUser(controller, userId: "user-2");

        // Act
        var result = await controller.GetJob(created!.Id);

        // Assert
        result.Result.Should().BeOfType<NotFoundResult>();
    }
}

