using Microsoft.Extensions.Options;
using RabbitMQ.Client;
using System.Text;

namespace WebApplicationFlytwo.Services;

public sealed class RabbitMqPublisher : IRabbitMqPublisher
{
    private readonly RabbitMqOptions _options;
    private readonly ILogger<RabbitMqPublisher> _logger;
    private readonly ConnectionFactory _factory;
    private readonly object _sync = new();
    private IConnection? _connection;
    private IModel? _channel;
    private bool _disposed;

    public RabbitMqPublisher(IOptions<RabbitMqOptions> options, ILogger<RabbitMqPublisher> logger)
    {
        _options = options.Value;
        _logger = logger;

        _factory = new ConnectionFactory
        {
            HostName = _options.HostName,
            Port = _options.Port,
            UserName = _options.UserName,
            Password = _options.Password,
            VirtualHost = _options.VirtualHost,
            DispatchConsumersAsync = true,
            AutomaticRecoveryEnabled = true,
            TopologyRecoveryEnabled = true
        };
    }

    public Task PublishAsync(string messageType, string payloadJson, CancellationToken cancellationToken)
    {
        if (_disposed)
            throw new ObjectDisposedException(nameof(RabbitMqPublisher));

        cancellationToken.ThrowIfCancellationRequested();

        EnsureConnected();

        if (_channel is null)
            throw new InvalidOperationException("RabbitMQ channel not available.");

        var body = Encoding.UTF8.GetBytes(payloadJson);

        var props = _channel.CreateBasicProperties();
        props.ContentType = "application/json";
        props.DeliveryMode = 2; // persistent
        props.Type = messageType;
        props.Timestamp = new AmqpTimestamp(DateTimeOffset.UtcNow.ToUnixTimeSeconds());

        _channel.BasicPublish(
            exchange: string.Empty,
            routingKey: _options.QueueName,
            basicProperties: props,
            body: body);

        _logger.LogDebug("Published message {Type} to queue {Queue}", messageType, _options.QueueName);
        return Task.CompletedTask;
    }

    private void EnsureConnected()
    {
        lock (_sync)
        {
            if (_disposed)
                return;

            if (_connection is null || !_connection.IsOpen)
            {
                _connection?.Dispose();
                _connection = _factory.CreateConnection("flytwo-api-outbox-publisher");
            }

            if (_channel is null || !_channel.IsOpen)
            {
                _channel?.Dispose();
                _channel = _connection.CreateModel();
                _channel.QueueDeclare(
                    queue: _options.QueueName,
                    durable: true,
                    exclusive: false,
                    autoDelete: false,
                    arguments: null);
            }
        }
    }

    public void Dispose()
    {
        if (_disposed)
            return;

        _disposed = true;
        try
        {
            _channel?.Close();
        }
        catch
        {
            // ignore
        }

        try
        {
            _connection?.Close();
        }
        catch
        {
            // ignore
        }

        _channel?.Dispose();
        _connection?.Dispose();
    }
}
