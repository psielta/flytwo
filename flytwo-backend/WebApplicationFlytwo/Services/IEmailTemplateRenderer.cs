namespace WebApplicationFlytwo.Services;

public interface IEmailTemplateRenderer
{
    Task<string> RenderAsync(string templateName, IDictionary<string, string> placeholders);
}
