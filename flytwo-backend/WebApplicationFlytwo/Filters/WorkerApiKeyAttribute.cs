using Microsoft.AspNetCore.Mvc;

namespace WebApplicationFlytwo.Filters;

/// <summary>
/// Authorizes internal worker-to-API calls using a shared API key header.
/// </summary>
public sealed class WorkerApiKeyAttribute : TypeFilterAttribute
{
    public WorkerApiKeyAttribute() : base(typeof(WorkerApiKeyFilter))
    {
    }
}

