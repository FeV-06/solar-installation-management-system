using System.Security.Claims;
using Application.Common.Models;
using Application.DTOs.Ai;

namespace Application.Interfaces.Services;

public interface IAiService
{
    Task<Result<AiChatResponse>> ChatAsync(AiChatRequest request, ClaimsPrincipal user, CancellationToken ct = default);
}
