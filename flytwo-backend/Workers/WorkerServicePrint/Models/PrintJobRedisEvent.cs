using Newtonsoft.Json;

namespace WorkerServicePrint.Models;

public sealed class PrintJobRedisEvent
{
    [JsonProperty("type")]
    public string Type { get; set; } = string.Empty; // progress | completed | failed

    [JsonProperty("jobId")]
    public Guid JobId { get; set; }

    [JsonProperty("userId")]
    public string? UserId { get; set; }

    [JsonProperty("current")]
    public int? Current { get; set; }

    [JsonProperty("total")]
    public int? Total { get; set; }

    [JsonProperty("message")]
    public string? Message { get; set; }

    [JsonProperty("outputBucket")]
    public string? OutputBucket { get; set; }

    [JsonProperty("outputKey")]
    public string? OutputKey { get; set; }

    [JsonProperty("outputUrl")]
    public string? OutputUrl { get; set; }

    [JsonProperty("outputExpiresAtUtc")]
    public DateTime? OutputExpiresAtUtc { get; set; }

    [JsonProperty("errorMessage")]
    public string? ErrorMessage { get; set; }

    [JsonProperty("occurredAtUtc")]
    public DateTime OccurredAtUtc { get; set; }
}

