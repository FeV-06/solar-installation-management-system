using System.Security.Claims;
using Application.DTOs.Ai;

namespace Application.Interfaces.Services;

public interface IAiToolRegistry
{
    IReadOnlyList<AiToolDefinition> GetToolsForUser(ClaimsPrincipal user);
    Task<AiToolExecutionResult> ExecuteToolAsync(string toolName, string argumentsJson, ClaimsPrincipal user, IServiceProvider scopedProvider, CancellationToken ct = default);
}
