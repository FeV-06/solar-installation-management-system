namespace Application.Interfaces.Services;

public record KnowledgeChunk(
    string Title,
    string Category,
    string Content,
    string SourceFile,
    double RelevanceScore = 1.0);

public interface IKnowledgeBaseService
{
    Task<IReadOnlyList<KnowledgeChunk>> SearchAsync(string query, string role, int maxResults = 5, CancellationToken ct = default);
}
