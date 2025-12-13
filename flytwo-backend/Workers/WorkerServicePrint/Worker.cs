using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using WorkerServicePrint.Models;
using WorkerServicePrint.Options;
using WorkerServicePrint.Services;

namespace WorkerServicePrint;

public sealed class Worker : BackgroundService
{
    private readonly RabbitMqOptions _rabbitOptions;
    private readonly RedisPublisher _redisPublisher;
    private readonly PrintApiClient _apiClient;
    private readonly FastReportRenderer _renderer;
    private readonly S3Uploader _uploader;
    private readonly ILogger<Worker> _logger;

    private IConnection? _connection;
    private IModel? _channel;

    public Worker(
        IOptions<RabbitMqOptions> rabbitOptions,
        RedisPublisher redisPublisher,
        PrintApiClient apiClient,
        FastReportRenderer renderer,
        S3Uploader uploader,
        ILogger<Worker> logger)
    {
        _rabbitOptions = rabbitOptions.Value;
        _redisPublisher = redisPublisher;
        _apiClient = apiClient;
        _renderer = renderer;
        _uploader = uploader;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        ConnectRabbit();

        if (_channel is null)
            throw new InvalidOperationException("RabbitMQ channel not initialized.");

        _channel.BasicQos(0, 1, false);

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.Received += async (_, ea) =>
        {
            var body = Encoding.UTF8.GetString(ea.Body.ToArray());

            try
            {
                await HandleMessageAsync(body, stoppingToken);
                _channel.BasicAck(ea.DeliveryTag, multiple: false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed processing message, will requeue");
                _channel.BasicNack(ea.DeliveryTag, multiple: false, requeue: true);
            }
        };

        _channel.BasicConsume(queue: _rabbitOptions.QueueName, autoAck: false, consumer: consumer);

        _logger.LogInformation("Worker consuming queue {Queue}", _rabbitOptions.QueueName);

        try
        {
            await Task.Delay(Timeout.InfiniteTimeSpan, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            // shutdown
        }
    }

    public override void Dispose()
    {
        try
        {
            _channel?.Close();
            _connection?.Close();
        }
        catch
        {
            // ignore
        }

        _channel?.Dispose();
        _connection?.Dispose();
        base.Dispose();
    }

    private void ConnectRabbit()
    {
        var factory = new ConnectionFactory
        {
            HostName = _rabbitOptions.HostName,
            Port = _rabbitOptions.Port,
            UserName = _rabbitOptions.UserName,
            Password = _rabbitOptions.Password,
            VirtualHost = _rabbitOptions.VirtualHost,
            DispatchConsumersAsync = true,
            AutomaticRecoveryEnabled = true,
            TopologyRecoveryEnabled = true
        };

        _connection = factory.CreateConnection("flytwo-worker-print");
        _channel = _connection.CreateModel();
        _channel.QueueDeclare(
            queue: _rabbitOptions.QueueName,
            durable: true,
            exclusive: false,
            autoDelete: false,
            arguments: null);
    }

    private async Task HandleMessageAsync(string rawJson, CancellationToken cancellationToken)
    {
        var queued = JsonConvert.DeserializeObject<PrintJobQueuedMessage>(rawJson);
        if (queued is null || queued.JobId == Guid.Empty)
        {
            _logger.LogWarning("Invalid queued message: {Json}", rawJson);
            return;
        }

        var workItem = await _apiClient.GetWorkItemAsync(queued.JobId, cancellationToken);
        if (workItem is null)
        {
            _logger.LogWarning("Work item not found for job {JobId}", queued.JobId);
            return;
        }

        await _redisPublisher.PublishAsync(new PrintJobRedisEvent
        {
            Type = "progress",
            JobId = workItem.JobId,
            UserId = workItem.CreatedByUserId,
            Current = 0,
            Total = GetTotal(workItem),
            Message = "Iniciando processamento",
            OccurredAtUtc = DateTime.UtcNow
        });

        var total = GetTotal(workItem);
        if (total > 0)
        {
            for (var i = 1; i <= total; i++)
            {
                if (i == 1 || i == total || i % 50 == 0)
                {
                    await _redisPublisher.PublishAsync(new PrintJobRedisEvent
                    {
                        Type = "progress",
                        JobId = workItem.JobId,
                        UserId = workItem.CreatedByUserId,
                        Current = i,
                        Total = total,
                        Message = $"Item {i}/{total}",
                        OccurredAtUtc = DateTime.UtcNow
                    });
                }
            }
        }

        await _redisPublisher.PublishAsync(new PrintJobRedisEvent
        {
            Type = "progress",
            JobId = workItem.JobId,
            UserId = workItem.CreatedByUserId,
            Current = total,
            Total = total,
            Message = "Renderizando relatorio",
            OccurredAtUtc = DateTime.UtcNow
        });

        string extension;
        string contentType;
        var bytes = _renderer.Render(workItem, out extension, out contentType);

        await _redisPublisher.PublishAsync(new PrintJobRedisEvent
        {
            Type = "progress",
            JobId = workItem.JobId,
            UserId = workItem.CreatedByUserId,
            Current = total,
            Total = total,
            Message = "Enviando para S3",
            OccurredAtUtc = DateTime.UtcNow
        });

        var (bucket, key, url, expiresAtUtc) = await _uploader.UploadAsync(
            workItem.JobId,
            workItem.ReportKey,
            extension,
            contentType,
            bytes,
            cancellationToken);

        await _redisPublisher.PublishAsync(new PrintJobRedisEvent
        {
            Type = "completed",
            JobId = workItem.JobId,
            UserId = workItem.CreatedByUserId,
            Current = total,
            Total = total,
            Message = "Concluido",
            OutputBucket = bucket,
            OutputKey = key,
            OutputUrl = url,
            OutputExpiresAtUtc = expiresAtUtc,
            OccurredAtUtc = DateTime.UtcNow
        });
    }

    private static int GetTotal(PrintJobWorkItemResponse workItem)
    {
        if (workItem.Data is not Newtonsoft.Json.Linq.JObject root)
            return 0;

        var first = root.Properties().Select(p => p.Value).OfType<Newtonsoft.Json.Linq.JArray>().FirstOrDefault();
        return first?.Count ?? 0;
    }
}

