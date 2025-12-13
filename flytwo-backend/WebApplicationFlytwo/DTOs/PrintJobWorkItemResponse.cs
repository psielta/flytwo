using Newtonsoft.Json.Linq;
using WebApplicationFlytwo.Entities;

namespace WebApplicationFlytwo.DTOs;

public class PrintJobWorkItemResponse
{
    public Guid JobId { get; set; }
    public Guid EmpresaId { get; set; }
    public string CreatedByUserId { get; set; } = string.Empty;

    public string ReportKey { get; set; } = string.Empty;
    public PrintJobFormat Format { get; set; }

    public JObject? Parameters { get; set; }
    public JToken? Data { get; set; }
}

