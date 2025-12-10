using System.Text;
using Microsoft.Extensions.FileProviders;

namespace WebApplicationFlytwo.Services;

public class FileEmailTemplateRenderer : IEmailTemplateRenderer
{
    private readonly IFileProvider _fileProvider;
    private readonly ILogger<FileEmailTemplateRenderer> _logger;

    public FileEmailTemplateRenderer(IWebHostEnvironment env, ILogger<FileEmailTemplateRenderer> logger)
    {
        _fileProvider = env.WebRootFileProvider;
        _logger = logger;
    }

    public async Task<string> RenderAsync(string templateName, IDictionary<string, string> placeholders)
    {
        var relativePath = $"email-templates/{templateName}.html";
        var file = _fileProvider.GetFileInfo(relativePath);

        if (!file.Exists)
        {
            _logger.LogWarning("Email template {Template} not found, using fallback text body", relativePath);
            return BuildFallback(placeholders);
        }

        using var stream = file.CreateReadStream();
        using var reader = new StreamReader(stream, Encoding.UTF8);
        var content = await reader.ReadToEndAsync();

        foreach (var kvp in placeholders)
        {
            content = content.Replace($"{{{{{kvp.Key}}}}}", kvp.Value);
        }

        return content;
    }

    private static string BuildFallback(IDictionary<string, string> placeholders)
    {
        var resetLink = placeholders.TryGetValue("ResetLink", out var link) ? link : "#";
        var token = placeholders.TryGetValue("ResetToken", out var t) ? t : "";
        var name = placeholders.TryGetValue("FullName", out var n) ? n : "usuário";

        return $@"
<p>Oi {name},</p>
<p>Recebemos um pedido para redefinir sua senha.</p>
<p><a href=""{resetLink}"">Clique aqui para redefinir</a></p>
<p>Ou use este token diretamente: <code>{token}</code></p>
<p>Se você não solicitou, ignore este email.</p>";
    }
}
