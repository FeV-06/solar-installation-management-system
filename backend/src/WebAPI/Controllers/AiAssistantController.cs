using Application.DTOs.Ai;
using Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using WebAPI.Security;

namespace WebAPI.Controllers;

[Route("api/ai")]
[ApiController]
public class AiAssistantController(IAiService aiService, IAiToolRegistry toolRegistry, IKnowledgeBaseService knowledgeBase) : ApiControllerBase
{
    [HttpPost("chat")]
    [AllowAnonymous]
    [EnableCors(CrossSiteCalls.QuoteForm)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AiChatResponse>> Chat([FromBody] AiChatRequest request, CancellationToken ct)
    {
        var result = await aiService.ChatAsync(request, User, ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    [HttpGet("tools")]
    [AllowAnonymous]
    [EnableCors(CrossSiteCalls.QuoteForm)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<AiToolDefinition>> GetTools()
    {
        var tools = toolRegistry.GetToolsForUser(User);
        return Ok(tools);
    }

    [HttpGet("knowledge")]
    [AllowAnonymous]
    [EnableCors(CrossSiteCalls.QuoteForm)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<KnowledgeChunk>>> SearchKnowledge([FromQuery] string query, CancellationToken ct)
    {
        var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "Customer";
        var chunks = await knowledgeBase.SearchAsync(query, role, 5, ct);
        return Ok(chunks);
    }
}
