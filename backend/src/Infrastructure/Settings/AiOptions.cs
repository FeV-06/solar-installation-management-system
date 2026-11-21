namespace Infrastructure.Settings;

public sealed class AiOptions
{
    public const string SectionName = "AI";

    public string Provider { get; set; } = "Simulation";
    public string? ApiKey { get; set; }
    public string ModelId { get; set; } = "gemini-2.5-flash";
    public string EmbeddingModelId { get; set; } = "text-embedding-004";
    public double Temperature { get; set; } = 0.2;
    public int MaxOutputTokens { get; set; } = 2048;
    public bool EnableDynamicEndpointTools { get; set; } = true;
}
