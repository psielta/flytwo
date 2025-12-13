using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using StackExchange.Redis;
using WorkerServicePrint.Models;
using WorkerServicePrint.Options;

namespace WorkerServicePrint.Services;

public sealed class RedisPublisher : IDisposable
{
    private readonly RedisOptions _options;
    private readonly ILogger<RedisPublisher> _logger;
    private readonly IConnectionMultiplexer _redis;
    private bool _disposed;

    public RedisPublisher(IOptions<RedisOptions> options, ILogger<RedisPublisher> logger)
    {
        _options = options.Value;
        _logger = logger;
        var config = ConfigurationOptions.Parse(_options.ConnectionString);
        config.AbortOnConnectFail = false;
        _redis = ConnectionMultiplexer.Connect(config);
    }

    public Task PublishAsync(PrintJobRedisEvent evt)
    {
        if (_disposed)
            throw new ObjectDisposedException(nameof(RedisPublisher));

        var json = JsonConvert.SerializeObject(evt);
        _logger.LogDebug("Publishing redis event {Type} job {JobId}", evt.Type, evt.JobId);
        return _redis.GetSubscriber().PublishAsync(RedisChannel.Literal(_options.Channel), json);
    }

    public void Dispose()
    {
        if (_disposed)
            return;

        _disposed = true;
        _redis.Dispose();
    }
}
