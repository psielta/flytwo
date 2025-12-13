using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
using Moq;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Entities;
using WebApplicationFlytwo.Hubs;
using WebApplicationFlytwo.Services;
using WebApplicationFlytwo.Tests.Fixtures;

namespace WebApplicationFlytwo.Tests.Services;

public class NotificationServiceTests : IClassFixture<TestFixture>
{
    private readonly TestFixture _fixture;

    public NotificationServiceTests(TestFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task CreateAsync_ScopeEmpresa_CreatesRecipientsForAllUsersInEmpresa()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var (hubContext, _) = CreateHubContextMock();
        var service = new NotificationService(context, hubContext);

        var empresaA = TestFixture.DefaultEmpresaId;
        var empresaB = Guid.Parse("22222222-2222-2222-2222-222222222222");

        context.Users.AddRange(
            new ApplicationUser { Id = "user-a1", Email = "a1@test.local", EmpresaId = empresaA },
            new ApplicationUser { Id = "user-a2", Email = "a2@test.local", EmpresaId = empresaA },
            new ApplicationUser { Id = "user-b1", Email = "b1@test.local", EmpresaId = empresaB }
        );
        await context.SaveChangesAsync();

        var request = new CreateNotificationRequest
        {
            Scope = NotificationScope.Empresa,
            Title = "Company",
            Message = "Hello company"
        };

        // Act
        var created = await service.CreateAsync(request, createdByUserId: "user-a1", createdByEmpresaId: empresaA);

        // Assert
        created.Should().NotBeNull();
        created!.Scope.Should().Be(NotificationScope.Empresa);
        created.EmpresaId.Should().Be(empresaA);

        var recipients = context.NotificationRecipients
            .Where(r => r.NotificationId == created.Id)
            .Select(r => r.UserId)
            .ToArray();

        recipients.Should().BeEquivalentTo(new[] { "user-a1", "user-a2" });
    }

    [Fact]
    public async Task CreateAsync_ScopeUsuario_DoesNotAllowCrossTenantTarget()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var (hubContext, _) = CreateHubContextMock();
        var service = new NotificationService(context, hubContext);

        var empresaA = TestFixture.DefaultEmpresaId;
        var empresaB = Guid.Parse("22222222-2222-2222-2222-222222222222");

        context.Users.AddRange(
            new ApplicationUser { Id = "user-a1", Email = "a1@test.local", EmpresaId = empresaA },
            new ApplicationUser { Id = "user-b1", Email = "b1@test.local", EmpresaId = empresaB }
        );
        await context.SaveChangesAsync();

        var request = new CreateNotificationRequest
        {
            Scope = NotificationScope.Usuario,
            TargetUserId = "user-b1",
            Title = "Direct",
            Message = "Hello"
        };

        // Act
        var created = await service.CreateAsync(request, createdByUserId: "user-a1", createdByEmpresaId: empresaA);

        // Assert
        created.Should().BeNull();
    }

    [Fact]
    public async Task MarkAsReadAsync_DoesNotAllowCrossTenantRead()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var (hubContext, _) = CreateHubContextMock();
        var service = new NotificationService(context, hubContext);

        var empresaA = TestFixture.DefaultEmpresaId;
        var empresaB = Guid.Parse("22222222-2222-2222-2222-222222222222");

        context.Users.AddRange(
            new ApplicationUser { Id = "user-a1", Email = "a1@test.local", EmpresaId = empresaA },
            new ApplicationUser { Id = "user-b1", Email = "b1@test.local", EmpresaId = empresaB }
        );
        await context.SaveChangesAsync();

        var created = await service.CreateAsync(
            new CreateNotificationRequest
            {
                Scope = NotificationScope.Empresa,
                Title = "Empresa B",
                Message = "Only empresa B"
            },
            createdByUserId: "user-b1",
            createdByEmpresaId: empresaB);

        created.Should().NotBeNull();

        // Act
        var ok = await service.MarkAsReadAsync(created!.Id, userId: "user-a1", empresaId: empresaA);

        // Assert
        ok.Should().BeFalse();
    }

    [Fact]
    public async Task MarkAllAsReadAsync_IncludesSystemNotificationsUsingLazyRecipients()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var (hubContext, _) = CreateHubContextMock();
        var service = new NotificationService(context, hubContext);

        var empresaA = TestFixture.DefaultEmpresaId;
        context.Users.AddRange(
            new ApplicationUser { Id = "user-a1", Email = "a1@test.local", EmpresaId = empresaA },
            new ApplicationUser { Id = "user-a2", Email = "a2@test.local", EmpresaId = empresaA }
        );
        await context.SaveChangesAsync();

        var system1 = await service.CreateAsync(
            new CreateNotificationRequest { Scope = NotificationScope.System, Title = "S1", Message = "System 1" },
            createdByUserId: "user-a1",
            createdByEmpresaId: empresaA);
        var system2 = await service.CreateAsync(
            new CreateNotificationRequest { Scope = NotificationScope.System, Title = "S2", Message = "System 2" },
            createdByUserId: "user-a1",
            createdByEmpresaId: empresaA);

        var empresa = await service.CreateAsync(
            new CreateNotificationRequest { Scope = NotificationScope.Empresa, Title = "E1", Message = "Empresa 1" },
            createdByUserId: "user-a1",
            createdByEmpresaId: empresaA);

        system1.Should().NotBeNull();
        system2.Should().NotBeNull();
        empresa.Should().NotBeNull();

        // Act
        var updated = await service.MarkAllAsReadAsync(userId: "user-a1", empresaId: empresaA);

        // Assert
        updated.Should().Be(3);

        var readIds = context.NotificationRecipients
            .Where(r => r.UserId == "user-a1" && r.ReadAtUtc != null)
            .Select(r => r.NotificationId)
            .ToArray();

        readIds.Should().BeEquivalentTo(new[] { system1!.Id, system2!.Id, empresa!.Id });
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

