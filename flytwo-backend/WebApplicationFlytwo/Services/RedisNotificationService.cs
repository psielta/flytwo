using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using StackExchange.Redis;
using System.Threading.Channels;
using WebApplicationFlytwo.Data;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Entities;
using WebApplicationFlytwo.Hubs;

namespace WebApplicationFlytwo.Services;

public sealed class RedisNotificationService : BackgroundService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<PrintHub, IPrintHubClient> _hubContext;
    private readonly ILogger<RedisNotificationService> _logger;
    private readonly string _channel;
    private readonly Channel<string> _messages = Channel.CreateUnbounded<string>();

    public RedisNotificationService(
        IConnectionMultiplexer redis,
        IServiceScopeFactory scopeFactory,
        IHubContext<PrintHub, IPrintHubClient> hubContext,
        IConfiguration configuration,
        ILogger<RedisNotificationService> logger)
    {
        _redis = redis;
        _scopeFactory = scopeFactory;
        _hubContext = hubContext;
        _logger = logger;
        _channel = configuration["Print:RedisChannel"] ?? "flytwo:print:events";
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("RedisNotificationService subscribing to channel {Channel}", _channel);

        var subscriber = _redis.GetSubscriber();
        await subscriber.SubscribeAsync(RedisChannel.Literal(_channel), (redisChannel, value) =>
        {
            var text = value.ToString();
            if (!string.IsNullOrWhiteSpace(text))
            {
                _messages.Writer.TryWrite(text);
            }
        });

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var message = await _messages.Reader.ReadAsync(stoppingToken);
                await HandleAsync(message, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed processing redis print event");
            }
        }
    }

    private async Task HandleAsync(string payload, CancellationToken cancellationToken)
    {
        PrintJobRedisEvent? evt;
        try
        {
            evt = JsonConvert.DeserializeObject<PrintJobRedisEvent>(payload);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Invalid redis message payload");
            return;
        }

        if (evt is null || evt.JobId == Guid.Empty || string.IsNullOrWhiteSpace(evt.Type))
            return;

        await using var scope = _scopeFactory.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

        var job = await context.PrintJobs.FirstOrDefaultAsync(j => j.Id == evt.JobId, cancellationToken);
        if (job is null)
            return;

        var now = DateTime.UtcNow;
        var userId = !string.IsNullOrWhiteSpace(evt.UserId) ? evt.UserId! : job.CreatedByUserId;

        var sendProgress = false;
        var createNotification = false;
        CreateNotificationRequest? notification = null;

        if (string.Equals(evt.Type, "progress", StringComparison.OrdinalIgnoreCase))
        {
            if (job.Status == PrintJobStatus.Queued)
            {
                job.Status = PrintJobStatus.Processing;
                job.StartedAtUtc ??= now;
            }

            job.ProgressCurrent = evt.Current ?? job.ProgressCurrent;
            job.ProgressTotal = evt.Total ?? job.ProgressTotal;
            job.LastProgressAtUtc = evt.OccurredAtUtc == default ? now : evt.OccurredAtUtc;
            job.ErrorMessage = null;
            sendProgress = true;
        }
        else if (string.Equals(evt.Type, "completed", StringComparison.OrdinalIgnoreCase))
        {
            if (job.Status != PrintJobStatus.Completed)
            {
                job.Status = PrintJobStatus.Completed;
                job.CompletedAtUtc = evt.OccurredAtUtc == default ? now : evt.OccurredAtUtc;
                job.ProgressCurrent = evt.Total ?? job.ProgressTotal ?? evt.Current ?? job.ProgressCurrent;
                job.ProgressTotal = evt.Total ?? job.ProgressTotal;
                job.LastProgressAtUtc = job.CompletedAtUtc;

                job.OutputBucket = evt.OutputBucket;
                job.OutputKey = evt.OutputKey;
                job.OutputUrl = evt.OutputUrl;
                job.OutputExpiresAtUtc = evt.OutputExpiresAtUtc;
                job.ErrorMessage = null;

                createNotification = true;
                notification = new CreateNotificationRequest
                {
                    Scope = NotificationScope.Usuario,
                    TargetUserId = userId,
                    Title = "Relatorio concluido",
                    Message = string.IsNullOrWhiteSpace(evt.OutputUrl)
                        ? $"Seu relatorio '{job.ReportKey}' foi concluido."
                        : $"Seu relatorio '{job.ReportKey}' foi concluido. Download: {evt.OutputUrl}",
                    Category = "Relatorios",
                    Severity = 0
                };
            }

            sendProgress = true;
        }
        else if (string.Equals(evt.Type, "failed", StringComparison.OrdinalIgnoreCase))
        {
            if (job.Status != PrintJobStatus.Failed)
            {
                job.Status = PrintJobStatus.Failed;
                job.CompletedAtUtc = evt.OccurredAtUtc == default ? now : evt.OccurredAtUtc;
                job.LastProgressAtUtc = job.CompletedAtUtc;
                job.ErrorMessage = evt.ErrorMessage ?? "Unknown error";

                createNotification = true;
                notification = new CreateNotificationRequest
                {
                    Scope = NotificationScope.Usuario,
                    TargetUserId = userId,
                    Title = "Relatorio falhou",
                    Message = $"Falha ao gerar relatorio '{job.ReportKey}': {job.ErrorMessage}",
                    Category = "Relatorios",
                    Severity = 2
                };
            }

            sendProgress = true;
        }

        if (sendProgress)
            await context.SaveChangesAsync(cancellationToken);

        if (sendProgress)
        {
            var percent = CalculatePercent(evt.Current ?? job.ProgressCurrent, evt.Total ?? job.ProgressTotal);

            await _hubContext.Clients
                .Group(PrintHubGroups.User(userId))
                .PrintJobProgress(new PrintJobProgressMessage(
                    job.Id,
                    job.Status.ToString(),
                    evt.Current ?? job.ProgressCurrent,
                    evt.Total ?? job.ProgressTotal,
                    evt.Message,
                    percent,
                    job.OutputUrl,
                    job.OutputExpiresAtUtc,
                    job.ErrorMessage,
                    evt.OccurredAtUtc == default ? now : evt.OccurredAtUtc));
        }

        if (createNotification && notification is not null)
        {
            await notificationService.CreateAsync(notification, createdByUserId: userId, createdByEmpresaId: job.EmpresaId);
        }
    }

    private static int? CalculatePercent(int? current, int? total)
    {
        if (current is null || total is null || total <= 0)
            return null;

        return (int)Math.Clamp(Math.Round(current.Value * 100d / total.Value), 0, 100);
    }
}
