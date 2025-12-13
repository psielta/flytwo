using WebApplicationFlytwo.DTOs;

namespace WebApplicationFlytwo.Services;

public interface INotificationService
{
    Task<NotificationDto?> CreateAsync(CreateNotificationRequest request, string createdByUserId, Guid? createdByEmpresaId);
    Task<PagedResponse<NotificationInboxItemDto>> GetInboxAsync(string userId, Guid empresaId, NotificationInboxQuery query);
    Task<bool> MarkAsReadAsync(Guid notificationId, string userId, Guid empresaId);
    Task<int> MarkAllAsReadAsync(string userId, Guid empresaId);
}

