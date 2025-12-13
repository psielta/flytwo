using WebApplicationFlytwo.DTOs;

namespace WebApplicationFlytwo.Services;

public interface IPrintJobService
{
    Task<PrintJobDto?> CreateJobAsync(string userId, Guid empresaId, CreatePrintJobRequest request);
    Task<PrintJobDto?> GetJobAsync(Guid jobId, string userId, Guid empresaId, bool isAdmin);
    Task<PrintJobWorkItemResponse?> GetWorkItemAsync(Guid jobId);
}

