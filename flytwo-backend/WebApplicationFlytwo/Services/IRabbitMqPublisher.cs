namespace WebApplicationFlytwo.Services;

public interface IRabbitMqPublisher : IDisposable
{
    Task PublishAsync(string messageType, string payloadJson, CancellationToken cancellationToken);
}

