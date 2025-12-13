using FastReport;
using Newtonsoft.Json.Linq;
using System.Data;
using WorkerServicePrint.Models;

namespace WorkerServicePrint.Services;

public sealed class FastReportRenderer
{
    private readonly ILogger<FastReportRenderer> _logger;

    public FastReportRenderer(ILogger<FastReportRenderer> logger)
    {
        _logger = logger;
    }

    public byte[] Render(PrintJobWorkItemResponse workItem, out string extension, out string contentType)
    {
        var templateFile = ReportTemplateRegistry.GetTemplateFileName(workItem.ReportKey);
        var templatePath = Path.Combine(AppContext.BaseDirectory, "Templates", templateFile);
        if (!File.Exists(templatePath))
            throw new FileNotFoundException($"Template not found: {templatePath}");

        using var report = new Report();
        report.Load(templatePath);

        RegisterDataSources(report, workItem.Data);

        report.Prepare();

        using var ms = new MemoryStream();

        switch (workItem.Format)
        {
            case PrintJobFormat.Pdf:
                ExportPdf(report, ms);
                extension = "pdf";
                contentType = "application/pdf";
                break;
            case PrintJobFormat.Xlsx:
                ExportXlsx(report, ms);
                extension = "xlsx";
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                break;
            default:
                throw new InvalidOperationException($"Unsupported format '{workItem.Format}'.");
        }

        return ms.ToArray();
    }

    private void RegisterDataSources(Report report, JToken? data)
    {
        if (data is not JObject root)
        {
            _logger.LogWarning("No data provided for report");
            return;
        }

        foreach (var prop in root.Properties())
        {
            if (prop.Value is not JArray rows)
                continue;

            var table = BuildTable(prop.Name, rows);
            report.RegisterData(table, prop.Name);

            var ds = report.GetDataSource(prop.Name);
            if (ds is not null)
                ds.Enabled = true;
        }
    }

    private static DataTable BuildTable(string name, JArray rows)
    {
        var table = new DataTable(name);

        var columns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var row in rows.OfType<JObject>())
        {
            foreach (var key in row.Properties().Select(p => p.Name))
                columns.Add(key);
        }

        foreach (var column in columns.OrderBy(x => x, StringComparer.OrdinalIgnoreCase))
        {
            table.Columns.Add(new DataColumn(column, typeof(string)));
        }

        foreach (var row in rows.OfType<JObject>())
        {
            var dataRow = table.NewRow();
            foreach (DataColumn column in table.Columns)
            {
                var token = row.GetValue(column.ColumnName, StringComparison.OrdinalIgnoreCase);
                dataRow[column.ColumnName] = token is null ? DBNull.Value : token.ToString();
            }
            table.Rows.Add(dataRow);
        }

        return table;
    }

    private static void ExportPdf(Report report, Stream output)
    {
        // FastReport export namespaces may vary by package/licensing. Keep as direct dependency on provided DLLs.
        var exporterType =
            Type.GetType("FastReport.Export.PdfSimple.PDFSimpleExport, FastReport") ??
            Type.GetType("FastReport.Export.Pdf.PDFExport, FastReport");

        if (exporterType is null)
            throw new InvalidOperationException("PDF exporter not found in FastReport assemblies. Ensure PDF export is available.");

        using var exporter = (IDisposable)Activator.CreateInstance(exporterType)!;
        var exportMethod = exporterType.GetMethod("Export", new[] { typeof(Report), typeof(Stream) });
        if (exportMethod is null)
            throw new InvalidOperationException("FastReport PDF exporter Export(Report, Stream) method not found.");

        exportMethod.Invoke(exporter, new object[] { report, output });
    }

    private static void ExportXlsx(Report report, Stream output)
    {
        var exporterType =
            Type.GetType("FastReport.Export.OoXML.Excel2007Export, FastReport") ??
            Type.GetType("FastReport.Export.OoXML.Excel2007Export, FastReport.Web");

        if (exporterType is null)
            throw new InvalidOperationException("XLSX exporter not found in FastReport assemblies. Ensure Excel export is available.");

        using var exporter = (IDisposable)Activator.CreateInstance(exporterType)!;
        var exportMethod = exporterType.GetMethod("Export", new[] { typeof(Report), typeof(Stream) });
        if (exportMethod is null)
            throw new InvalidOperationException("FastReport XLSX exporter Export(Report, Stream) method not found.");

        exportMethod.Invoke(exporter, new object[] { report, output });
    }
}

