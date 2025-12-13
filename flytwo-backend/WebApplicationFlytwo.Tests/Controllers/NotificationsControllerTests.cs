using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Moq;
using WebApplicationFlytwo.Controllers;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Entities;
using WebApplicationFlytwo.Hubs;
using WebApplicationFlytwo.Services;
using WebApplicationFlytwo.Tests.Fixtures;

namespace WebApplicationFlytwo.Tests.Controllers;

public class NotificationsControllerTests : IClassFixture<TestFixture>
{
    private readonly TestFixture _fixture;

    public NotificationsControllerTests(TestFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task Inbox_ReturnsOnlySystemEmpresaAndUserScopeForAuthenticatedUser()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var (hubContext, _) = CreateHubContextMock();
        var service = new NotificationService(context, hubContext);
        var logger = _fixture.CreateLogger<NotificationsController>();

        var empresaA = TestFixture.DefaultEmpresaId;
        var empresaB = Guid.Parse("22222222-2222-2222-2222-222222222222");

        context.Users.AddRange(
            new ApplicationUser { Id = "user-a1", Email = "a1@test.local", EmpresaId = empresaA },
            new ApplicationUser { Id = "user-a2", Email = "a2@test.local", EmpresaId = empresaA },
            new ApplicationUser { Id = "user-b1", Email = "b1@test.local", EmpresaId = empresaB }
        );
        await context.SaveChangesAsync();

        await service.CreateAsync(
            new CreateNotificationRequest { Scope = NotificationScope.System, Title = "S", Message = "System" },
            createdByUserId: "user-a1",
            createdByEmpresaId: empresaA);

        await service.CreateAsync(
            new CreateNotificationRequest { Scope = NotificationScope.Empresa, Title = "EA", Message = "Empresa A" },
            createdByUserId: "user-a1",
            createdByEmpresaId: empresaA);

        await service.CreateAsync(
            new CreateNotificationRequest { Scope = NotificationScope.Empresa, Title = "EB", Message = "Empresa B" },
            createdByUserId: "user-b1",
            createdByEmpresaId: empresaB);

        await service.CreateAsync(
            new CreateNotificationRequest { Scope = NotificationScope.Usuario, TargetUserId = "user-a1", Title = "UA1", Message = "User A1" },
            createdByUserId: "user-a2",
            createdByEmpresaId: empresaA);

        await service.CreateAsync(
            new CreateNotificationRequest { Scope = NotificationScope.Usuario, TargetUserId = "user-b1", Title = "UB1", Message = "User B1" },
            createdByUserId: "user-b1",
            createdByEmpresaId: empresaB);

        var controller = new NotificationsController(service, logger.Object);
        _fixture.SetAuthenticatedUser(controller, empresaId: empresaA, userId: "user-a1");

        // Act
        var result = await controller.Inbox(new NotificationInboxQuery { Page = 1, PageSize = 50 });

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        var ok = result.Result as OkObjectResult;
        var response = ok!.Value as PagedResponse<NotificationInboxItemDto>;
        response.Should().NotBeNull();
        response!.Items.Should().HaveCount(3);

        response.Items.Should().OnlyContain(n =>
            n.Scope == NotificationScope.System ||
            (n.Scope == NotificationScope.Empresa && n.EmpresaId == empresaA) ||
            (n.Scope == NotificationScope.Usuario && n.TargetUserId == "user-a1"));
    }

    private static (IHubContext<NotificationsHub, INotificationsHubClient> HubContext, Mock<INotificationsHubClient> Client) CreateHubContextMock()
    {
        var client = new Mock<INotificationsHubClient>();

        var clients = new Mock<IHubClients<INotificationsHubClient>>();
        clients.Setup(c => c.Group(It.IsAny<string>())).Returns(client.Object);

        var hubContext = new Mock<IHubContext<NotificationsHub, INotificationsHubClient>>();
        hubContext.SetupGet(h => h.Clients).Returns(clients.Object);

        return (hubContext.Object, client);
    }
}

