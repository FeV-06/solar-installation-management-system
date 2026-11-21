namespace Application.DTOs.Ai;

public record AiChatMessage(
    string Role,
    string Content,
    IReadOnlyList<AiToolCall>? ToolCalls = null,
    string? ToolCallId = null,
    string? ToolResult = null);

public record AiToolCall(
    string Id,
    string Name,
    string ArgumentsJson);

public record AiToolDefinition(
    string Name,
    string Description,
    string AllowedRoles,
    string ParametersSchemaJson,
    bool RequiresConfirmation = false);

public record AiToolExecutionResult(
    string ToolName,
    string ArgumentsJson,
    string ResultJson,
    bool IsSuccess,
    bool RequiresConfirmation = false,
    string? ConfirmationMessage = null);

public record AiChatRequest(
    IReadOnlyList<AiChatMessage> Messages,
    string? PersonaOverride = null);

public record AiChatResponse(
    string Content,
    IReadOnlyList<AiToolExecutionResult>? ExecutedTools = null,
    bool RequiresConfirmation = false,
    string? ConfirmationPrompt = null);
