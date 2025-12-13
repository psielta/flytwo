using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace WebApplicationFlytwo.Filters;

public sealed class WorkerApiKeyFilter : IAsyncActionFilter
{
    private const string HeaderName = "X-Worker-Api-Key";

    private readonly IConfiguration _configuration;
    private readonly ILogger<WorkerApiKeyFilter> _logger;

    public WorkerApiKeyFilter(IConfiguration configuration, ILogger<WorkerApiKeyFilter> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var expected =
            _configuration["Print:WorkerApiKey"] ??
            _configuration["WorkerApiKey"];

        if (string.IsNullOrWhiteSpace(expected))
        {
            _logger.LogError("Worker API key is not configured (Print:WorkerApiKey)");
            context.Result = new StatusCodeResult(StatusCodes.Status500InternalServerError);
            return;
        }

        var provided = context.HttpContext.Request.Headers[HeaderName].FirstOrDefault();
        if (!string.Equals(provided, expected, StringComparison.Ordinal))
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        await next();
    }
}

