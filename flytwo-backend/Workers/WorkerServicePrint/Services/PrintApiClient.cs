using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using WorkerServicePrint.Models;
using WorkerServicePrint.Options;

namespace WorkerServicePrint.Services;

public sealed class PrintApiClient
{
    private readonly HttpClient _httpClient;
    private readonly PrintApiOptions _options;

    public PrintApiClient(HttpClient httpClient, IOptions<PrintApiOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<PrintJobWorkItemResponse?> GetWorkItemAsync(Guid jobId, CancellationToken cancellationToken)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, $"api/print/internal/jobs/{jobId:D}/work-item");
        request.Headers.Add("X-Worker-Api-Key", _options.WorkerApiKey);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
            return null;

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        return JsonConvert.DeserializeObject<PrintJobWorkItemResponse>(json);
    }
}

