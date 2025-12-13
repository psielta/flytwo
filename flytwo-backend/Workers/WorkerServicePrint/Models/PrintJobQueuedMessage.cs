using Newtonsoft.Json;

namespace WorkerServicePrint.Models;

public sealed class PrintJobQueuedMessage
{
    [JsonProperty("messageType")]
    public string MessageType { get; set; } = string.Empty;

    [JsonProperty("jobId")]
    public Guid JobId { get; set; }

    [JsonProperty("occurredAtUtc")]
    public DateTime OccurredAtUtc { get; set; }
}

