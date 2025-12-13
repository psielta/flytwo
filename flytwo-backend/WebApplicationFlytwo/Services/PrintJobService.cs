using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using WebApplicationFlytwo.Data;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Entities;

namespace WebApplicationFlytwo.Services;

public sealed class PrintJobService : IPrintJobService
{
    private readonly AppDbContext _context;
    private readonly ILogger<PrintJobService> _logger;

    public PrintJobService(AppDbContext context, ILogger<PrintJobService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<PrintJobDto?> CreateJobAsync(string userId, Guid empresaId, CreatePrintJobRequest request)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return null;

        if (empresaId == Guid.Empty)
            return null;

        var reportKey = (request.ReportKey ?? string.Empty).Trim().ToLowerInvariant();
        if (!PrintReportKeys.All.Contains(reportKey))
            return null;

        var now = DateTime.UtcNow;
        var jobId = Guid.NewGuid();

        var job = new PrintJob
        {
            Id = jobId,
            EmpresaId = empresaId,
            CreatedByUserId = userId,
            ReportKey = reportKey,
            Format = request.Format,
            Status = PrintJobStatus.Queued,
            ParametersJson = request.Parameters is null ? null : request.Parameters.ToString(Formatting.None),
            CreatedAtUtc = now,
            StartedAtUtc = null,
            CompletedAtUtc = null,
            ProgressCurrent = null,
            ProgressTotal = null,
            LastProgressAtUtc = null,
            OutputBucket = null,
            OutputKey = null,
            OutputUrl = null,
            OutputExpiresAtUtc = null,
            ErrorMessage = null
        };

        var outbox = new OutboxMessage
        {
            Id = Guid.NewGuid(),
            Type = OutboxMessageTypes.PrintJobQueuedV1,
            PayloadJson = JsonConvert.SerializeObject(new
            {
                messageType = OutboxMessageTypes.PrintJobQueuedV1,
                jobId = jobId,
                occurredAtUtc = now
            }),
            OccurredAtUtc = now,
            ProcessedAtUtc = null,
            Attempts = 0,
            LockedUntilUtc = null,
            LastAttemptAtUtc = null,
            LastError = null
        };

        _context.PrintJobs.Add(job);
        _context.OutboxMessages.Add(outbox);

        if (_context.Database.IsRelational())
        {
            await using var tx = await _context.Database.BeginTransactionAsync();
            await _context.SaveChangesAsync();
            await tx.CommitAsync();
        }
        else
        {
            await _context.SaveChangesAsync();
        }

        _logger.LogInformation("Created print job {JobId} report {ReportKey} format {Format} for user {UserId}", jobId, reportKey, request.Format, userId);

        return Map(job);
    }

    public async Task<PrintJobDto?> GetJobAsync(Guid jobId, string userId, Guid empresaId, bool isAdmin)
    {
        if (jobId == Guid.Empty || string.IsNullOrWhiteSpace(userId) || empresaId == Guid.Empty)
            return null;

        var query = _context.PrintJobs.AsNoTracking().Where(j => j.Id == jobId && j.EmpresaId == empresaId);
        if (!isAdmin)
            query = query.Where(j => j.CreatedByUserId == userId);

        var job = await query.FirstOrDefaultAsync();
        return job is null ? null : Map(job);
    }

    public async Task<PrintJobWorkItemResponse?> GetWorkItemAsync(Guid jobId)
    {
        if (jobId == Guid.Empty)
            return null;

        var job = await _context.PrintJobs
            .AsNoTracking()
            .FirstOrDefaultAsync(j => j.Id == jobId);

        if (job is null)
            return null;

        var parameters = string.IsNullOrWhiteSpace(job.ParametersJson) ? null : JObject.Parse(job.ParametersJson);

        var data = await BuildReportDataAsync(job.ReportKey, job.EmpresaId, parameters);
        if (data is null)
            return null;

        return new PrintJobWorkItemResponse
        {
            JobId = job.Id,
            EmpresaId = job.EmpresaId,
            CreatedByUserId = job.CreatedByUserId,
            ReportKey = job.ReportKey,
            Format = job.Format,
            Parameters = parameters,
            Data = data
        };
    }

    private async Task<JObject?> BuildReportDataAsync(string reportKey, Guid empresaId, JObject? parameters)
    {
        if (string.Equals(reportKey, PrintReportKeys.WeatherForecast, StringComparison.OrdinalIgnoreCase))
        {
            var days = 5;
            var token = parameters?["days"];
            if (token is not null && int.TryParse(token.ToString(), out var parsed))
                days = Math.Clamp(parsed, 1, 30);

            var summaries = new[]
            {
                "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
            };

            var items = Enumerable.Range(1, days).Select(index =>
            {
                var temperatureC = Random.Shared.Next(-20, 55);
                return new
                {
                    Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(index)).ToString("yyyy-MM-dd"),
                    TemperatureC = temperatureC,
                    TemperatureF = 32 + (int)(temperatureC / 0.5556),
                    Summary = summaries[Random.Shared.Next(summaries.Length)]
                };
            }).ToArray();

            return new JObject
            {
                ["WeatherForecastList"] = JToken.FromObject(items)
            };
        }

        if (string.Equals(reportKey, PrintReportKeys.Products, StringComparison.OrdinalIgnoreCase))
        {
            var onlyActive = true;
            var onlyActiveToken = parameters?["onlyActive"];
            if (onlyActiveToken is not null && bool.TryParse(onlyActiveToken.ToString(), out var parsedOnlyActive))
                onlyActive = parsedOnlyActive;

            var category = parameters?["category"]?.ToString();
            if (string.IsNullOrWhiteSpace(category))
                category = null;

            var query = _context.Products
                .AsNoTracking()
                .Where(p => p.EmpresaId == empresaId);

            if (onlyActive)
                query = query.Where(p => p.IsActive);

            if (!string.IsNullOrWhiteSpace(category))
                query = query.Where(p => p.Category == category);

            var items = await query
                .OrderByDescending(p => p.CreatedAt)
                .Take(1000)
                .Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.Category,
                    p.Price,
                    p.Sku,
                    p.StockQuantity,
                    p.IsActive,
                    p.CreatedAt,
                    p.UpdatedAt
                })
                .ToListAsync();

            return new JObject
            {
                ["Products"] = JToken.FromObject(items)
            };
        }

        return null;
    }

    private static PrintJobDto Map(PrintJob job)
    {
        return new PrintJobDto
        {
            Id = job.Id,
            ReportKey = job.ReportKey,
            Format = job.Format,
            Status = job.Status,
            CreatedAtUtc = job.CreatedAtUtc,
            StartedAtUtc = job.StartedAtUtc,
            CompletedAtUtc = job.CompletedAtUtc,
            ProgressCurrent = job.ProgressCurrent,
            ProgressTotal = job.ProgressTotal,
            LastProgressAtUtc = job.LastProgressAtUtc,
            OutputUrl = job.OutputUrl,
            OutputExpiresAtUtc = job.OutputExpiresAtUtc,
            ErrorMessage = job.ErrorMessage
        };
    }
}
