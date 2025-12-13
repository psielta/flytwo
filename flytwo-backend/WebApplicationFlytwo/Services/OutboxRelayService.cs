using Microsoft.EntityFrameworkCore;
using WebApplicationFlytwo.Data;

namespace WebApplicationFlytwo.Services;

public sealed class OutboxRelayService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IRabbitMqPublisher _publisher;
    private readonly ILogger<OutboxRelayService> _logger;

    public OutboxRelayService(IServiceScopeFactory scopeFactory, IRabbitMqPublisher publisher, ILogger<OutboxRelayService> logger)
    {
        _scopeFactory = scopeFactory;
        _publisher = publisher;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("OutboxRelayService started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var processedAny = await RelayOnceAsync(stoppingToken);
                if (!processedAny)
                    await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OutboxRelayService loop failure");
                await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
            }
        }

        _logger.LogInformation("OutboxRelayService stopped");
    }

    private async Task<bool> RelayOnceAsync(CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var now = DateTime.UtcNow;
        var lockUntil = now.AddMinutes(2);

        var batch = await context.OutboxMessages
            .Where(m => m.ProcessedAtUtc == null && (m.LockedUntilUtc == null || m.LockedUntilUtc <= now))
            .OrderBy(m => m.OccurredAtUtc)
            .Take(50)
            .ToListAsync(cancellationToken);

        if (batch.Count == 0)
            return false;

        foreach (var message in batch)
        {
            message.LockedUntilUtc = lockUntil;
            message.Attempts += 1;
            message.LastAttemptAtUtc = now;
        }

        await context.SaveChangesAsync(cancellationToken);

        var anyProcessed = false;

        foreach (var message in batch)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                await _publisher.PublishAsync(message.Type, message.PayloadJson, cancellationToken);

                message.ProcessedAtUtc = DateTime.UtcNow;
                message.LockedUntilUtc = null;
                message.LastError = null;
                anyProcessed = true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to publish outbox message {OutboxId} type {Type}", message.Id, message.Type);
                message.LastError = Truncate(ex.Message, 4000);
                message.LockedUntilUtc = DateTime.UtcNow.AddSeconds(10);
            }
        }

        await context.SaveChangesAsync(cancellationToken);
        return anyProcessed;
    }

    private static string Truncate(string value, int maxLength)
    {
        if (string.IsNullOrEmpty(value))
            return value;

        return value.Length <= maxLength ? value : value[..maxLength];
    }
}

