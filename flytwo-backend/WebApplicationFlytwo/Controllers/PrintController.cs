using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Filters;
using WebApplicationFlytwo.Security;
using WebApplicationFlytwo.Services;

namespace WebApplicationFlytwo.Controllers;

[Authorize]
[ApiController]
[Route("api/print")]
public class PrintController : BaseApiController
{
    private readonly IPrintJobService _printJobService;
    private readonly ILogger<PrintController> _logger;

    public PrintController(IPrintJobService printJobService, ILogger<PrintController> logger)
    {
        _printJobService = printJobService;
        _logger = logger;
    }

    [HttpPost("jobs")]
    [Authorize(Policy = PermissionCatalog.Relatorios.Gerar)]
    [SwaggerOperation(Summary = "Create a print job (async)")]
    [ProducesResponseType(typeof(PrintJobDto), StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PrintJobDto>> CreateJob([FromBody] CreatePrintJobRequest request)
    {
        if (UserId is null || EmpresaId is null)
            return Forbid();

        var created = await _printJobService.CreateJobAsync(UserId, EmpresaId.Value, request);
        if (created is null)
            return Forbid();

        _logger.LogInformation("Print job {JobId} created by user {UserId}", created.Id, UserId);
        return AcceptedAtAction(nameof(GetJob), new { id = created.Id }, created);
    }

    [HttpGet("jobs/{id:guid}")]
    [Authorize(Policy = PermissionCatalog.Relatorios.Visualizar)]
    [SwaggerOperation(Summary = "Get print job status")]
    [ProducesResponseType(typeof(PrintJobDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PrintJobDto>> GetJob([FromRoute] Guid id)
    {
        if (UserId is null || EmpresaId is null)
            return Forbid();

        var isAdmin = UserRoles.Any(r => string.Equals(r, FlytwoRoles.Admin, StringComparison.OrdinalIgnoreCase));
        var job = await _printJobService.GetJobAsync(id, UserId, EmpresaId.Value, isAdmin);
        if (job is null)
            return NotFound();

        return Ok(job);
    }

    [AllowAnonymous]
    [WorkerApiKey]
    [HttpGet("internal/jobs/{id:guid}/work-item")]
    [SwaggerOperation(Summary = "Get print job work item for worker (internal)")]
    [ProducesResponseType(typeof(PrintJobWorkItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PrintJobWorkItemResponse>> GetWorkItem([FromRoute] Guid id)
    {
        var item = await _printJobService.GetWorkItemAsync(id);
        if (item is null)
            return NotFound();

        return Ok(item);
    }
}

