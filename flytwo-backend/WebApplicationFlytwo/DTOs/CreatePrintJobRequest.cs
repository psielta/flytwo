using Newtonsoft.Json.Linq;
using WebApplicationFlytwo.Entities;

namespace WebApplicationFlytwo.DTOs;

public class CreatePrintJobRequest
{
    public string ReportKey { get; set; } = string.Empty;
    public PrintJobFormat Format { get; set; }

    /// <summary>
    /// Report parameters (varies by ReportKey).
    /// </summary>
    public JObject? Parameters { get; set; }
}

