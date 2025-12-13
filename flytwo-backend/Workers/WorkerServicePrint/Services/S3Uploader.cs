using Amazon;
using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Util;
using Microsoft.Extensions.Options;
using WorkerServicePrint.Options;

namespace WorkerServicePrint.Services;

public sealed class S3Uploader : IDisposable
{
    private readonly S3Options _options;
    private readonly ILogger<S3Uploader> _logger;
    private readonly IAmazonS3 _s3;
    private bool _disposed;

    public S3Uploader(IOptions<S3Options> options, ILogger<S3Uploader> logger)
    {
        _options = options.Value;
        _logger = logger;

        var regionName = Environment.GetEnvironmentVariable("AWS_REGION") ?? "us-east-1";
        _s3 = new AmazonS3Client(RegionEndpoint.GetBySystemName(regionName));
    }

    public async Task<(string Bucket, string Key, string Url, DateTime ExpiresAtUtc)> UploadAsync(
        Guid jobId,
        string reportKey,
        string extension,
        string contentType,
        byte[] bytes,
        CancellationToken cancellationToken)
    {
        var bucket = Environment.GetEnvironmentVariable("AWS_S3_BUCKET");
        if (string.IsNullOrWhiteSpace(bucket))
            throw new InvalidOperationException("AWS_S3_BUCKET is not set.");

        if (!await AmazonS3Util.DoesS3BucketExistV2Async(_s3, bucket))
            _logger.LogWarning("S3 bucket {Bucket} not found or not accessible", bucket);

        var key = $"{_options.OutputPrefix.TrimEnd('/')}/{jobId:D}/{reportKey}.{extension}";

        await using var ms = new MemoryStream(bytes);
        var put = new PutObjectRequest
        {
            BucketName = bucket,
            Key = key,
            InputStream = ms,
            ContentType = contentType
        };

        await _s3.PutObjectAsync(put, cancellationToken);

        var expiresAtUtc = DateTime.UtcNow.AddHours(Math.Clamp(_options.PreSignedUrlExpiryHours, 1, 24 * 7));
        var url = _s3.GetPreSignedURL(new Amazon.S3.Model.GetPreSignedUrlRequest
        {
            BucketName = bucket,
            Key = key,
            Expires = expiresAtUtc
        });

        return (bucket, key, url, expiresAtUtc);
    }

    public void Dispose()
    {
        if (_disposed)
            return;

        _disposed = true;
        _s3.Dispose();
    }
}

