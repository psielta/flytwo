using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Security;
using WebApplicationFlytwo.Services;

namespace WebApplicationFlytwo.Controllers;

[Authorize]
[ApiController]
[Route("api/notifications")]
public class NotificationsController : BaseApiController
{
    private readonly INotificationService _notificationService;
    private readonly ILogger<NotificationsController> _logger;

    public NotificationsController(
        INotificationService notificationService,
        ILogger<NotificationsController> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    [HttpPost]
    [Authorize(Policy = PermissionCatalog.Notificacoes.Criar)]
    [SwaggerOperation(Summary = "Create notification")]
    [ProducesResponseType(typeof(NotificationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<NotificationDto>> Create([FromBody] CreateNotificationRequest request)
    {
        if (UserId is null)
            return Forbid();

        _logger.LogInformation("Creating notification scope {Scope} by user {UserId}", request.Scope, UserId);

        var created = await _notificationService.CreateAsync(request, UserId, EmpresaId);
        if (created is null)
            return Forbid();

        return Ok(created);
    }

    [HttpGet("inbox")]
    [Authorize(Policy = PermissionCatalog.Notificacoes.Visualizar)]
    [SwaggerOperation(Summary = "User notifications inbox (paged/filtered)")]
    [ProducesResponseType(typeof(PagedResponse<NotificationInboxItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResponse<NotificationInboxItemDto>>> Inbox([FromQuery] NotificationInboxQuery query)
    {
        if (UserId is null || EmpresaId is null)
            return Forbid();

        var result = await _notificationService.GetInboxAsync(UserId, EmpresaId.Value, query);
        return Ok(result);
    }

    [HttpPost("{id:guid}/read")]
    [Authorize(Policy = PermissionCatalog.Notificacoes.Visualizar)]
    [SwaggerOperation(Summary = "Mark notification as read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> MarkAsRead([FromRoute] Guid id)
    {
        if (UserId is null || EmpresaId is null)
            return Forbid();

        var ok = await _notificationService.MarkAsReadAsync(id, UserId, EmpresaId.Value);
        if (!ok)
            return NotFound();

        return NoContent();
    }

    [HttpPost("read-all")]
    [Authorize(Policy = PermissionCatalog.Notificacoes.Visualizar)]
    [SwaggerOperation(Summary = "Mark all notifications as read")]
    [ProducesResponseType(typeof(MarkAllAsReadResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<MarkAllAsReadResponse>> MarkAllAsRead()
    {
        if (UserId is null || EmpresaId is null)
            return Forbid();

        var updated = await _notificationService.MarkAllAsReadAsync(UserId, EmpresaId.Value);
        return Ok(new MarkAllAsReadResponse { UpdatedCount = updated });
    }
}
