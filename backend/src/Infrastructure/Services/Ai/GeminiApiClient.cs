using System.Text;
using System.Text.Json;
using Application.DTOs.Ai;
using Infrastructure.Settings;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Infrastructure.Services.Ai;

public interface ILlmClient
{
    Task<LlmResponse> GenerateAsync(string systemPrompt, IReadOnlyList<AiChatMessage> messages, IReadOnlyList<AiToolDefinition> tools, CancellationToken ct = default);
}

public record LlmResponse(string Content, IReadOnlyList<AiToolCall> ToolCalls);

public class GeminiApiClient(HttpClient http, IOptions<AiOptions> options, ILogger<GeminiApiClient> logger) : ILlmClient
{
    private readonly AiOptions _opt = options.Value;

    public async Task<LlmResponse> GenerateAsync(string systemPrompt, IReadOnlyList<AiChatMessage> messages, IReadOnlyList<AiToolDefinition> tools, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_opt.ApiKey))
        {
            throw new InvalidOperationException("Gemini API key is not configured.");
        }

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_opt.ModelId}:generateContent?key={_opt.ApiKey}";

        var contents = new List<object>();
        foreach (var msg in messages)
        {
            var role = msg.Role switch
            {
                "model" or "assistant" => "model",
                _ => "user"
            };

            var parts = new List<object> { new { text = msg.Content } };
            if (!string.IsNullOrWhiteSpace(msg.ToolResult))
            {
                parts.Add(new
                {
                    functionResponse = new
                    {
                        name = msg.ToolCallId ?? "tool_result",
                        response = new { output = msg.ToolResult }
                    }
                });
            }

            contents.Add(new { role, parts });
        }

        // Add function declarations
        var functionDeclarations = tools.Select(t =>
        {
            using var doc = JsonDocument.Parse(t.ParametersSchemaJson);
            return new
            {
                name = t.Name,
                description = t.Description,
                parameters = doc.RootElement.Clone()
            };
        }).ToList();

        var payload = new
        {
            system_instruction = new
            {
                parts = new[] { new { text = systemPrompt } }
            },
            contents,
            tools = functionDeclarations.Count > 0
                ? new object[] { new { function_declarations = functionDeclarations } }
                : null,
            generationConfig = new
            {
                temperature = _opt.Temperature,
                maxOutputTokens = _opt.MaxOutputTokens
            }
        };

        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions { DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull });
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await http.PostAsync(url, content, ct);
        var responseBody = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("Gemini API error ({StatusCode}): {Body}", response.StatusCode, responseBody);
            throw new HttpRequestException($"Gemini API returned {response.StatusCode}: {responseBody}");
        }

        using var respDoc = JsonDocument.Parse(responseBody);
        var candidates = respDoc.RootElement.GetProperty("candidates");
        if (candidates.GetArrayLength() == 0)
        {
            return new LlmResponse("I could not generate a response at this time.", []);
        }

        var firstCandidate = candidates[0];
        var partsEl = firstCandidate.GetProperty("content").GetProperty("parts");

        var textSb = new StringBuilder();
        var toolCalls = new List<AiToolCall>();

        foreach (var part in partsEl.EnumerateArray())
        {
            if (part.TryGetProperty("text", out var txt))
            {
                textSb.Append(txt.GetString());
            }
            if (part.TryGetProperty("functionCall", out var fnCall))
            {
                var fnName = fnCall.GetProperty("name").GetString() ?? "";
                var fnArgs = fnCall.GetProperty("args").GetRawText();
                toolCalls.Add(new AiToolCall(fnName, fnName, fnArgs));
            }
        }

        return new LlmResponse(textSb.ToString().Trim(), toolCalls);
    }
}
