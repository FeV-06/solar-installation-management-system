using System.Security.Claims;
using System.Text.Json;
using Application.Common.Models;
using Application.DTOs.Ai;
using Application.Interfaces.Services;
using Infrastructure.Auth;
using Infrastructure.Settings;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Infrastructure.Services.Ai;

public class AiService(
    IKnowledgeBaseService knowledgeBase,
    IAiToolRegistry toolRegistry,
    IOptions<AiOptions> options,
    IServiceProvider serviceProvider,
    HttpClient httpClient,
    ILogger<AiService> logger) : IAiService
{
    private readonly AiOptions _opt = options.Value;

    public async Task<Result<AiChatResponse>> ChatAsync(AiChatRequest request, ClaimsPrincipal user, CancellationToken ct = default)
    {
        try
        {
            var role = user.FindFirst(Session.RoleClaim)?.Value
                ?? (user.IsInRole(Session.CustomerRole) ? Session.CustomerRole : "Customer");

            var lastUserMessage = request.Messages.LastOrDefault(m => m.Role == "user")?.Content ?? "";

            // 1. Retrieve RAG knowledge
            var knowledge = await knowledgeBase.SearchAsync(lastUserMessage, role, maxResults: 4, ct);

            // 2. Build multi-persona prompt
            var systemPrompt = PersonaPromptBuilder.BuildPrompt(user, knowledge);

            // 3. Get allowed tools for this user
            var availableTools = _opt.EnableDynamicEndpointTools ? toolRegistry.GetToolsForUser(user) : [];

            // 4. Resolve LLM client
            ILlmClient llmClient = (!string.IsNullOrWhiteSpace(_opt.ApiKey) && _opt.Provider.Equals("Gemini", StringComparison.OrdinalIgnoreCase))
                ? new GeminiApiClient(httpClient, options, serviceProvider.GetRequiredService<ILogger<GeminiApiClient>>())
                : new SimulationAiClient();

            // 5. Generate completion
            var response = await llmClient.GenerateAsync(systemPrompt, request.Messages, availableTools, ct);

            // 6. Handle tool execution if requested by the LLM
            var executedTools = new List<AiToolExecutionResult>();
            if (response.ToolCalls.Count > 0)
            {
                foreach (var toolCall in response.ToolCalls)
                {
                    logger.LogInformation("AI Assistant executing tool: {ToolName} with arguments: {Args}", toolCall.Name, toolCall.ArgumentsJson);
                    var result = await toolRegistry.ExecuteToolAsync(toolCall.Name, toolCall.ArgumentsJson, user, serviceProvider, ct);
                    executedTools.Add(result);
                }

                // If content is empty (e.g. pure tool call), synthesize a natural language response
                var content = response.Content;
                if (string.IsNullOrWhiteSpace(content))
                {
                    var successful = executedTools.Where(t => t.IsSuccess).ToList();
                    var failed = executedTools.Where(t => !t.IsSuccess).ToList();

                    if (successful.Count > 0 && failed.Count == 0)
                    {
                        var first = successful[0];
                        if (first.ToolName == "customer_calculate_sizing")
                        {
                            using var doc = JsonDocument.Parse(first.ResultJson);
                            var root = doc.RootElement;
                            var cap = root.GetProperty("recommendedCapacityKw").GetDecimal();
                            var subsidy = root.GetProperty("estimatedSubsidyRupees").GetDecimal();
                            var net = root.GetProperty("netPayableRupees").GetDecimal();
                            var advance = root.GetProperty("advanceRequired20Pct").GetDecimal();
                            var panels = root.GetProperty("panelCount").GetInt32();

                            content = $"Based on your electricity consumption, here is your recommended system configuration:\n\n" +
                                      $"• **Recommended Sizing**: **{cap} kW On-Grid System**\n" +
                                      $"• **Solar Panels**: {panels}x 550W Half-Cut Mono-PERC modules\n" +
                                      $"• **PM Surya Ghar Subsidy**: **₹{subsidy:N0}** (Direct central benefit)\n" +
                                      $"• **Net Customer Cost**: **₹{net:N0}**\n" +
                                      $"• **20% Advance to Start**: **₹{advance:N0}**\n\n" +
                                      $"Would you like me to submit this quote request for your property?";
                        }
                        else
                        {
                            content = $"{first.ResultJson}";
                        }
                    }
                    else if (failed.Count > 0)
                    {
                        content = $"The requested action could not be completed: {failed[0].ResultJson}";
                    }
                    else
                    {
                        content = "Task processed.";
                    }
                }

                return Result.Success(new AiChatResponse(content, executedTools));
            }

            return Result.Success(new AiChatResponse(response.Content, executedTools));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error processing AI chat request.");
            return Result.Failure<AiChatResponse>(new Error(ErrorKind.Conflict, "ai.error", "An error occurred while generating the assistant response: " + ex.Message));
        }
    }
}
