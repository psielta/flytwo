using Microsoft.Extensions.Options;
using WorkerServicePrint;
using WorkerServicePrint.Options;
using WorkerServicePrint.Services;

EnvLoader.LoadIfExists(Path.Combine(Directory.GetCurrentDirectory(), ".env"));

var builder = Host.CreateApplicationBuilder(args);

builder.Services.Configure<RabbitMqOptions>(builder.Configuration.GetSection("RabbitMq"));
builder.Services.Configure<RedisOptions>(builder.Configuration.GetSection("Redis"));
builder.Services.Configure<PrintApiOptions>(builder.Configuration.GetSection("PrintApi"));
builder.Services.Configure<S3Options>(builder.Configuration.GetSection("S3"));

builder.Services.AddHttpClient<PrintApiClient>((sp, client) =>
{
    var options = sp.GetRequiredService<IOptions<PrintApiOptions>>().Value;
    client.BaseAddress = new Uri(options.BaseUrl, UriKind.Absolute);
});

builder.Services.AddSingleton<RedisPublisher>();
builder.Services.AddSingleton<FastReportRenderer>();
builder.Services.AddSingleton<S3Uploader>();

builder.Services.AddHostedService<Worker>();

var host = builder.Build();
host.Run();
