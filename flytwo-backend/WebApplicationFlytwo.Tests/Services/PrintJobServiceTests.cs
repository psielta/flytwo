using FluentAssertions;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Entities;
using WebApplicationFlytwo.Services;
using WebApplicationFlytwo.Tests.Fixtures;

namespace WebApplicationFlytwo.Tests.Services;

public class PrintJobServiceTests : IClassFixture<TestFixture>
{
    private readonly TestFixture _fixture;

    public PrintJobServiceTests(TestFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task CreateJobAsync_CreatesPrintJobAndOutboxMessage()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var logger = _fixture.CreateLogger<PrintJobService>();
        var service = new PrintJobService(context, logger.Object);

        var request = new CreatePrintJobRequest
        {
            ReportKey = PrintReportKeys.WeatherForecast,
            Format = PrintJobFormat.Pdf
        };

        // Act
        var created = await service.CreateJobAsync("user-1", TestFixture.DefaultEmpresaId, request);

        // Assert
        created.Should().NotBeNull();
        context.PrintJobs.Should().HaveCount(1);
        context.OutboxMessages.Should().HaveCount(1);

        var outbox = context.OutboxMessages.Single();
        outbox.Type.Should().Be(OutboxMessageTypes.PrintJobQueuedV1);
        outbox.PayloadJson.Should().Contain(created!.Id.ToString("D"));
    }

    [Fact]
    public async Task GetJobAsync_DoesNotAllowOtherUser_WhenNotAdmin()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var logger = _fixture.CreateLogger<PrintJobService>();
        var service = new PrintJobService(context, logger.Object);

        var created = await service.CreateJobAsync(
            "user-1",
            TestFixture.DefaultEmpresaId,
            new CreatePrintJobRequest { ReportKey = PrintReportKeys.WeatherForecast, Format = PrintJobFormat.Pdf });

        created.Should().NotBeNull();

        // Act
        var job = await service.GetJobAsync(created!.Id, "user-2", TestFixture.DefaultEmpresaId, isAdmin: false);

        // Assert
        job.Should().BeNull();
    }

    [Fact]
    public async Task GetWorkItemAsync_WeatherForecast_ReturnsDataset()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var logger = _fixture.CreateLogger<PrintJobService>();
        var service = new PrintJobService(context, logger.Object);

        var created = await service.CreateJobAsync(
            "user-1",
            TestFixture.DefaultEmpresaId,
            new CreatePrintJobRequest { ReportKey = PrintReportKeys.WeatherForecast, Format = PrintJobFormat.Pdf });

        // Act
        var workItem = await service.GetWorkItemAsync(created!.Id);

        // Assert
        workItem.Should().NotBeNull();
        workItem!.ReportKey.Should().Be(PrintReportKeys.WeatherForecast);
        workItem.Data.Should().NotBeNull();
        workItem.Data!["WeatherForecastList"].Should().NotBeNull();
        workItem.Data!["WeatherForecastList"]!.Should().HaveCountGreaterThan(0);
    }

    [Fact]
    public async Task GetWorkItemAsync_Products_ReturnsOnlyEmpresaProducts()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var logger = _fixture.CreateLogger<PrintJobService>();
        var service = new PrintJobService(context, logger.Object);

        var empresaA = TestFixture.DefaultEmpresaId;
        var empresaB = Guid.Parse("22222222-2222-2222-2222-222222222222");

        context.Products.AddRange(
            TestFixture.CreateProduct(id: 1, name: "A1", empresaId: empresaA),
            TestFixture.CreateProduct(id: 2, name: "A2", empresaId: empresaA),
            TestFixture.CreateProduct(id: 3, name: "B1", empresaId: empresaB)
        );
        await context.SaveChangesAsync();

        var created = await service.CreateJobAsync(
            "user-1",
            empresaA,
            new CreatePrintJobRequest { ReportKey = PrintReportKeys.Products, Format = PrintJobFormat.Pdf });

        // Act
        var workItem = await service.GetWorkItemAsync(created!.Id);

        // Assert
        workItem.Should().NotBeNull();
        workItem!.ReportKey.Should().Be(PrintReportKeys.Products);
        var products = workItem.Data!["Products"]!;
        products.Should().HaveCount(2);
    }
}

