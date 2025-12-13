namespace WorkerServicePrint.Services;

public static class EnvLoader
{
    public static void LoadIfExists(string path)
    {
        if (!File.Exists(path))
            return;

        foreach (var rawLine in File.ReadAllLines(path))
        {
            var line = rawLine.Trim();
            if (line.Length == 0 || line.StartsWith('#'))
                continue;

            var idx = line.IndexOf('=');
            if (idx <= 0)
                continue;

            var key = line[..idx].Trim();
            var value = line[(idx + 1)..].Trim();

            if (string.IsNullOrWhiteSpace(key))
                continue;

            if (Environment.GetEnvironmentVariable(key) is null)
            {
                Environment.SetEnvironmentVariable(key, value);
            }
        }
    }
}

