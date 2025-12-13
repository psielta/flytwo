using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using WebApplicationFlytwo.Data;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Entities;
using WebApplicationFlytwo.Hubs;

namespace WebApplicationFlytwo.Services;

public sealed class NotificationService : INotificationService
{
    private readonly AppDbContext _context;
    private readonly IHubContext<NotificationsHub, INotificationsHubClient> _hubContext;

    public NotificationService(
        AppDbContext context,
        IHubContext<NotificationsHub, INotificationsHubClient> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    public async Task<NotificationDto?> CreateAsync(
        CreateNotificationRequest request,
        string createdByUserId,
        Guid? createdByEmpresaId)
    {
        if (string.IsNullOrWhiteSpace(createdByUserId))
            return null;

        var now = DateTime.UtcNow;

        var entity = new Notification
        {
            Id = Guid.NewGuid(),
            Scope = request.Scope,
            EmpresaId = null,
            TargetUserId = null,
            Title = request.Title,
            Message = request.Message,
            Category = string.IsNullOrWhiteSpace(request.Category) ? null : request.Category,
            Severity = request.Severity,
            CreatedAtUtc = now,
            CreatedByUserId = createdByUserId
        };

        switch (request.Scope)
        {
            case NotificationScope.System:
                break;

            case NotificationScope.Empresa:
            {
                if (createdByEmpresaId is null)
                    return null;

                if (request.EmpresaId is not null && request.EmpresaId != createdByEmpresaId)
                    return null;

                entity.EmpresaId = createdByEmpresaId.Value;
                break;
            }

            case NotificationScope.Usuario:
            {
                if (createdByEmpresaId is null)
                    return null;

                if (string.IsNullOrWhiteSpace(request.TargetUserId))
                    return null;

                var target = await _context.Users
                    .AsNoTracking()
                    .Where(u => u.Id == request.TargetUserId)
                    .Select(u => new { u.Id, u.EmpresaId })
                    .FirstOrDefaultAsync();

                if (target is null)
                    return null;

                if (target.EmpresaId != createdByEmpresaId.Value)
                    return null;

                entity.TargetUserId = target.Id;
                break;
            }

            default:
                return null;
        }

        _context.Notifications.Add(entity);

        if (entity.Scope == NotificationScope.Empresa)
        {
            var empresaId = entity.EmpresaId!.Value;
            var userIds = await _context.Users
                .AsNoTracking()
                .Where(u => u.EmpresaId == empresaId)
                .Select(u => u.Id)
                .ToListAsync();

            var recipients = new List<NotificationRecipient>(userIds.Count);
            foreach (var userId in userIds)
            {
                recipients.Add(new NotificationRecipient
                {
                    NotificationId = entity.Id,
                    UserId = userId,
                    ReadAtUtc = null,
                    DeliveredAtUtc = null
                });
            }

            _context.NotificationRecipients.AddRange(recipients);
        }
        else if (entity.Scope == NotificationScope.Usuario)
        {
            _context.NotificationRecipients.Add(new NotificationRecipient
            {
                NotificationId = entity.Id,
                UserId = entity.TargetUserId!,
                ReadAtUtc = null,
                DeliveredAtUtc = null
            });
        }

        await _context.SaveChangesAsync();

        var pushed = new NotificationPushedMessage(
            entity.Id,
            entity.Scope,
            entity.EmpresaId,
            entity.TargetUserId,
            entity.Title,
            entity.Message,
            entity.Category,
            entity.Severity,
            entity.CreatedAtUtc);

        switch (entity.Scope)
        {
            case NotificationScope.System:
                await _hubContext.Clients.Group(NotificationsHubGroups.System).NotificationPushed(pushed);
                break;
            case NotificationScope.Empresa:
                await _hubContext.Clients.Group(NotificationsHubGroups.Empresa(entity.EmpresaId!.Value)).NotificationPushed(pushed);
                break;
            case NotificationScope.Usuario:
                await _hubContext.Clients.Group(NotificationsHubGroups.User(entity.TargetUserId!)).NotificationPushed(pushed);
                break;
        }

        return new NotificationDto
        {
            Id = entity.Id,
            Scope = entity.Scope,
            EmpresaId = entity.EmpresaId,
            TargetUserId = entity.TargetUserId,
            Title = entity.Title,
            Message = entity.Message,
            Category = entity.Category,
            Severity = entity.Severity,
            CreatedAtUtc = entity.CreatedAtUtc
        };
    }

    public async Task<PagedResponse<NotificationInboxItemDto>> GetInboxAsync(string userId, Guid empresaId, NotificationInboxQuery query)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return new PagedResponse<NotificationInboxItemDto>();

        if (empresaId == Guid.Empty)
            return new PagedResponse<NotificationInboxItemDto>();

        var baseQuery =
            from n in _context.Notifications.AsNoTracking()
            join r in _context.NotificationRecipients.AsNoTracking().Where(x => x.UserId == userId)
                on n.Id equals r.NotificationId into recipients
            from r in recipients.DefaultIfEmpty()
            where
                n.Scope == NotificationScope.System ||
                (n.Scope == NotificationScope.Empresa && n.EmpresaId == empresaId) ||
                (n.Scope == NotificationScope.Usuario && n.TargetUserId == userId)
            select new { Notification = n, ReadAtUtc = (DateTime?)r.ReadAtUtc };

        if (query.FromUtc is not null)
            baseQuery = baseQuery.Where(x => x.Notification.CreatedAtUtc >= query.FromUtc.Value);

        if (query.ToUtc is not null)
            baseQuery = baseQuery.Where(x => x.Notification.CreatedAtUtc <= query.ToUtc.Value);

        if (query.Severity is not null)
            baseQuery = baseQuery.Where(x => x.Notification.Severity == query.Severity.Value);

        if (query.UnreadOnly)
            baseQuery = baseQuery.Where(x => x.ReadAtUtc == null);

        baseQuery = baseQuery.OrderByDescending(x => x.Notification.CreatedAtUtc);

        var totalCount = await baseQuery.CountAsync();
        var pageNumber = query.Page <= 0 ? 1 : query.Page;
        var pageSize = query.PageSize <= 0 ? 20 : query.PageSize;

        var items = await baseQuery
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new NotificationInboxItemDto
            {
                Id = x.Notification.Id,
                Scope = x.Notification.Scope,
                EmpresaId = x.Notification.EmpresaId,
                TargetUserId = x.Notification.TargetUserId,
                Title = x.Notification.Title,
                Message = x.Notification.Message,
                Category = x.Notification.Category,
                Severity = x.Notification.Severity,
                CreatedAtUtc = x.Notification.CreatedAtUtc,
                ReadAtUtc = x.ReadAtUtc
            })
            .ToListAsync();

        return new PagedResponse<NotificationInboxItemDto>
        {
            Items = items,
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }

    public async Task<bool> MarkAsReadAsync(Guid notificationId, string userId, Guid empresaId)
    {
        if (notificationId == Guid.Empty)
            return false;

        if (string.IsNullOrWhiteSpace(userId))
            return false;

        var notification = await _context.Notifications
            .AsNoTracking()
            .FirstOrDefaultAsync(n => n.Id == notificationId);

        if (notification is null)
            return false;

        if (!CanAccess(notification, userId, empresaId))
            return false;

        var recipient = await _context.NotificationRecipients.FindAsync(notificationId, userId);

        if (notification.Scope != NotificationScope.System && recipient is null)
            return false;

        if (recipient is null)
        {
            recipient = new NotificationRecipient
            {
                NotificationId = notificationId,
                UserId = userId,
                ReadAtUtc = null,
                DeliveredAtUtc = null
            };

            _context.NotificationRecipients.Add(recipient);
        }

        if (recipient.ReadAtUtc is null)
        {
            recipient.ReadAtUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return true;
    }

    public async Task<int> MarkAllAsReadAsync(string userId, Guid empresaId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return 0;

        if (empresaId == Guid.Empty)
            return 0;

        var now = DateTime.UtcNow;

        var recipientsToUpdate =
            await (
                from r in _context.NotificationRecipients
                join n in _context.Notifications on r.NotificationId equals n.Id
                where r.UserId == userId
                      && r.ReadAtUtc == null
                      && (
                          n.Scope == NotificationScope.System ||
                          (n.Scope == NotificationScope.Empresa && n.EmpresaId == empresaId) ||
                          (n.Scope == NotificationScope.Usuario && n.TargetUserId == userId)
                      )
                select r
            ).ToListAsync();

        foreach (var recipient in recipientsToUpdate)
        {
            recipient.ReadAtUtc = now;
        }

        var systemIdsToInsert = await _context.Notifications
            .AsNoTracking()
            .Where(n => n.Scope == NotificationScope.System)
            .Where(n => !_context.NotificationRecipients.Any(r => r.UserId == userId && r.NotificationId == n.Id))
            .Select(n => n.Id)
            .ToListAsync();

        if (systemIdsToInsert.Count > 0)
        {
            var newRecipients = new List<NotificationRecipient>(systemIdsToInsert.Count);
            foreach (var notificationId in systemIdsToInsert)
            {
                newRecipients.Add(new NotificationRecipient
                {
                    NotificationId = notificationId,
                    UserId = userId,
                    ReadAtUtc = now,
                    DeliveredAtUtc = null
                });
            }

            _context.NotificationRecipients.AddRange(newRecipients);
        }

        var changed = recipientsToUpdate.Count + systemIdsToInsert.Count;
        if (changed > 0)
            await _context.SaveChangesAsync();

        return changed;
    }

    private static bool CanAccess(Notification notification, string userId, Guid empresaId)
    {
        return notification.Scope switch
        {
            NotificationScope.System => true,
            NotificationScope.Empresa => notification.EmpresaId == empresaId,
            NotificationScope.Usuario => string.Equals(notification.TargetUserId, userId, StringComparison.Ordinal),
            _ => false
        };
    }
}

