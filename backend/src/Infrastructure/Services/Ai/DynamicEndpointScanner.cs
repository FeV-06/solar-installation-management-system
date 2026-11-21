using System.Security.Claims;
using System.Text.Json;
using Application.DTOs.Ai;
using Application.DTOs.Common;
using Application.DTOs.CustomerPortal;
using Application.DTOs.Lead;
using Application.DTOs.Quote;
using Application.DTOs.Survey;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services;
using Domain.Enums;
using Infrastructure.Auth;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.Ai;

public class DynamicEndpointScanner : IAiToolRegistry
{
    private readonly ILogger<DynamicEndpointScanner> _logger;
    private readonly List<AiToolDefinition> _toolDefinitions = [];

    public DynamicEndpointScanner(ILogger<DynamicEndpointScanner> logger)
    {
        _logger = logger;
        RegisterStandardTools();
    }

    public IReadOnlyList<AiToolDefinition> GetToolsForUser(ClaimsPrincipal user)
    {
        var role = user.FindFirst(Session.RoleClaim)?.Value
            ?? (user.IsInRole(Session.CustomerRole) ? Session.CustomerRole : "Anonymous");

        return _toolDefinitions.Where(t =>
            t.AllowedRoles.Contains("*") ||
            t.AllowedRoles.Contains(role, StringComparison.OrdinalIgnoreCase) ||
            (role == "Admin") // Admin can access all tools
        ).ToList();
    }

    public async Task<AiToolExecutionResult> ExecuteToolAsync(
        string toolName,
        string argumentsJson,
        ClaimsPrincipal user,
        IServiceProvider scopedProvider,
        CancellationToken ct = default)
    {
        var userIdStr = user.FindFirst(Session.UserIdClaim)?.Value;
        int.TryParse(userIdStr, out var userId);
        var role = user.FindFirst(Session.RoleClaim)?.Value
            ?? (user.IsInRole(Session.CustomerRole) ? Session.CustomerRole : "Anonymous");

        var tool = _toolDefinitions.FirstOrDefault(t => t.Name.Equals(toolName, StringComparison.OrdinalIgnoreCase));
        if (tool == null)
        {
            return new AiToolExecutionResult(toolName, argumentsJson, "Tool not found.", false);
        }

        if (!tool.AllowedRoles.Contains("*") && !tool.AllowedRoles.Contains(role, StringComparison.OrdinalIgnoreCase) && role != "Admin")
        {
            return new AiToolExecutionResult(toolName, argumentsJson, $"Access denied. Role '{role}' cannot invoke tool '{toolName}'.", false);
        }

        try
        {
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };

            switch (toolName.ToLowerInvariant())
            {
                // Customer Tools
                case "customer_get_portal_data":
                {
                    if (userId == 0) return new AiToolExecutionResult(toolName, argumentsJson, "Not signed in as a customer.", false);
                    var service = scopedProvider.GetRequiredService<ICustomerPortalService>();
                    var res = await service.GetPortalDataAsync(userId);
                    return res.IsSuccess
                        ? new AiToolExecutionResult(toolName, argumentsJson, JsonSerializer.Serialize(res.Value), true)
                        : new AiToolExecutionResult(toolName, argumentsJson, res.Error.Message, false);
                }

                case "customer_calculate_sizing":
                {
                    using var doc = JsonDocument.Parse(argumentsJson);
                    var bill = doc.RootElement.TryGetProperty("monthlyBillRupees", out var b) ? b.GetDecimal() : 2500m;
                    decimal capacityKw = bill switch
                    {
                        < 1500m => 1.0m,
                        < 2500m => 2.0m,
                        < 4000m => 3.0m,
                        < 5500m => 4.0m,
                        _ => 5.0m
                    };
                    decimal subsidy = capacityKw switch
                    {
                        <= 1.0m => 30000m,
                        <= 2.0m => 60000m,
                        _ => 78000m
                    };
                    var panels = (int)Math.Ceiling((capacityKw * 1000m) / 550m);
                    if (panels % 2 != 0) panels++;
                    var approxCost = capacityKw * 65000m;
                    var netPayable = Math.Max(0m, approxCost - subsidy);

                    var result = new
                    {
                        recommendedCapacityKw = capacityKw,
                        panelCount = panels,
                        panelWattage = "550W Half-Cut Mono-PERC",
                        estimatedSubsidyRupees = subsidy,
                        approximateCostRupees = approxCost,
                        netPayableRupees = netPayable,
                        advanceRequired20Pct = Math.Round(netPayable * 0.20m, 2),
                        requiredRoofAreaSqM = capacityKw * 8m
                    };
                    return new AiToolExecutionResult(toolName, argumentsJson, JsonSerializer.Serialize(result), true);
                }

                case "customer_pay_quote":
                {
                    if (userId == 0) return new AiToolExecutionResult(toolName, argumentsJson, "Not signed in as a customer.", false);
                    using var doc = JsonDocument.Parse(argumentsJson);
                    var quoteId = doc.RootElement.GetProperty("quoteId").GetInt32();
                    var payType = doc.RootElement.TryGetProperty("paymentType", out var pt) ? pt.GetString() ?? "Advance" : "Advance";

                    var service = scopedProvider.GetRequiredService<IQuoteService>();
                    var res = await service.AcceptAndPayAsync(quoteId, new CustomerPayQuoteRequest(payType), userId, ct);
                    return res.IsSuccess
                        ? new AiToolExecutionResult(toolName, argumentsJson, $"Payment recorded ({payType}). Order #{quoteId} confirmed. Status: {res.Value.Status}, Payment Ref: {res.Value.PaymentReference}", true)
                        : new AiToolExecutionResult(toolName, argumentsJson, res.Error.Message, false);
                }

                // Technician Tools
                case "technician_get_assigned_surveys":
                {
                    var service = scopedProvider.GetRequiredService<ISurveyService>();
                    var res = await service.GetPageAsync(new SurveyPageRequest { Page = 1, PageSize = 20 }, userId, role == "Admin");
                    return new AiToolExecutionResult(toolName, argumentsJson, JsonSerializer.Serialize(res.Items), true);
                }

                case "technician_submit_survey_report":
                {
                    using var doc = JsonDocument.Parse(argumentsJson);
                    var surveyId = doc.RootElement.GetProperty("surveyId").GetInt32();
                    var req = JsonSerializer.Deserialize<SubmitSurveyReportRequest>(argumentsJson, options);
                    if (req == null) return new AiToolExecutionResult(toolName, argumentsJson, "Invalid parameters.", false);

                    var service = scopedProvider.GetRequiredService<ISurveyService>();
                    var res = await service.SubmitAsync(surveyId, req, userId);
                    return res.IsSuccess
                        ? new AiToolExecutionResult(toolName, argumentsJson, $"Survey #{surveyId} report successfully submitted. Status: {res.Value.Status}", true)
                        : new AiToolExecutionResult(toolName, argumentsJson, res.Error.Message, false);
                }

                // Admin / Sales Tools
                case "sales_get_leads":
                {
                    var service = scopedProvider.GetRequiredService<ILeadService>();
                    var res = await service.GetPageAsync(new LeadPageRequest { Page = 1, PageSize = 15 });
                    return new AiToolExecutionResult(toolName, argumentsJson, JsonSerializer.Serialize(res.Items), true);
                }

                case "sales_convert_lead":
                {
                    using var doc = JsonDocument.Parse(argumentsJson);
                    var leadId = doc.RootElement.GetProperty("leadId").GetInt32();
                    var service = scopedProvider.GetRequiredService<ILeadService>();
                    var res = await service.ConvertAsync(leadId);
                    return res.IsSuccess
                        ? new AiToolExecutionResult(toolName, argumentsJson, $"Lead #{leadId} successfully converted into Customer #{(res.Value.Customer != null ? res.Value.Customer.Id : 0)} and Installation #{res.Value.InstallationId}.", true)
                        : new AiToolExecutionResult(toolName, argumentsJson, res.Error.Message, false);
                }

                case "admin_schedule_survey":
                {
                    using var doc = JsonDocument.Parse(argumentsJson);
                    var installationId = doc.RootElement.GetProperty("installationId").GetInt32();
                    var techId = doc.RootElement.GetProperty("technicianId").GetInt32();
                    var scheduledAt = doc.RootElement.TryGetProperty("scheduledAt", out var sa) ? sa.GetDateTime() : DateTime.UtcNow.AddDays(1);

                    var service = scopedProvider.GetRequiredService<ISurveyService>();
                    var res = await service.ScheduleAsync(installationId, new ScheduleSurveyRequest { TechnicianId = techId, ScheduledAt = scheduledAt }, userId);
                    return res.IsSuccess
                        ? new AiToolExecutionResult(toolName, argumentsJson, $"Survey scheduled for installation #{installationId} with technician #{techId} at {scheduledAt:u}.", true)
                        : new AiToolExecutionResult(toolName, argumentsJson, res.Error.Message, false);
                }

                case "admin_review_survey":
                {
                    using var doc = JsonDocument.Parse(argumentsJson);
                    var surveyId = doc.RootElement.GetProperty("surveyId").GetInt32();
                    var approved = doc.RootElement.GetProperty("approved").GetBoolean();
                    var notes = doc.RootElement.TryGetProperty("reviewNotes", out var rn) ? rn.GetString() : null;

                    var service = scopedProvider.GetRequiredService<ISurveyService>();
                    var res = await service.ReviewAsync(surveyId, new ReviewSurveyRequest { Approved = approved, Notes = notes }, userId);
                    return res.IsSuccess
                        ? new AiToolExecutionResult(toolName, argumentsJson, $"Survey #{surveyId} review recorded: {(approved ? "Approved" : "Rejected")}.", true)
                        : new AiToolExecutionResult(toolName, argumentsJson, res.Error.Message, false);
                }

                case "admin_generate_quote":
                {
                    using var doc = JsonDocument.Parse(argumentsJson);
                    var installationId = doc.RootElement.GetProperty("installationId").GetInt32();
                    decimal? cap = doc.RootElement.TryGetProperty("systemCapacityKw", out var c) ? c.GetDecimal() : null;
                    var type = doc.RootElement.TryGetProperty("systemType", out var st) ? st.GetString() : "OnGrid";
                    var notes = doc.RootElement.TryGetProperty("notes", out var n) ? n.GetString() : "Generated via AI Assistant";

                    var service = scopedProvider.GetRequiredService<IQuoteService>();
                    var res = await service.GenerateOrUpdateAsync(installationId, new GenerateQuoteRequest(cap, type, notes), ct);
                    return res.IsSuccess
                        ? new AiToolExecutionResult(toolName, argumentsJson, $"Quote #{res.Value.Id} generated for Installation #{installationId}: {res.Value.SystemCapacityKw} kW {res.Value.SystemType}. Base: ₹{res.Value.BasePriceRupees:N0}, Subsidy: ₹{res.Value.EstimatedSubsidyRupees:N0}, Total Payable: ₹{res.Value.TotalAmountRupees:N0}, Advance Required: ₹{res.Value.AdvanceRequiredRupees:N0}.", true)
                        : new AiToolExecutionResult(toolName, argumentsJson, res.Error.Message, false);
                }

                case "admin_send_quote":
                {
                    using var doc = JsonDocument.Parse(argumentsJson);
                    var quoteId = doc.RootElement.GetProperty("quoteId").GetInt32();
                    var service = scopedProvider.GetRequiredService<IQuoteService>();
                    var res = await service.SendQuoteAsync(quoteId, ct);
                    return res.IsSuccess
                        ? new AiToolExecutionResult(toolName, argumentsJson, $"Quote #{quoteId} marked as Sent and delivered to customer.", true)
                        : new AiToolExecutionResult(toolName, argumentsJson, res.Error.Message, false);
                }

                case "warehouse_get_packing_order":
                {
                    using var doc = JsonDocument.Parse(argumentsJson);
                    var installationId = doc.RootElement.GetProperty("installationId").GetInt32();
                    var service = scopedProvider.GetRequiredService<IQuoteService>();
                    var res = await service.GetPackingOrderByInstallationAsync(installationId, ct);
                    return res.IsSuccess
                        ? new AiToolExecutionResult(toolName, argumentsJson, JsonSerializer.Serialize(res.Value), true)
                        : new AiToolExecutionResult(toolName, argumentsJson, res.Error.Message, false);
                }

                case "warehouse_update_packing_item":
                {
                    using var doc = JsonDocument.Parse(argumentsJson);
                    var orderId = doc.RootElement.GetProperty("packingOrderId").GetInt32();
                    var itemId = doc.RootElement.GetProperty("itemId").GetInt32();
                    var isPacked = doc.RootElement.GetProperty("isPacked").GetBoolean();
                    var serial = doc.RootElement.TryGetProperty("serialNumber", out var s) ? s.GetString() : null;

                    var service = scopedProvider.GetRequiredService<IQuoteService>();
                    var res = await service.UpdatePackingItemAsync(orderId, itemId, isPacked, serial, ct);
                    return res.IsSuccess
                        ? new AiToolExecutionResult(toolName, argumentsJson, $"Packing item #{itemId} updated. Packed: {isPacked}, Serial: {serial ?? "None"}.", true)
                        : new AiToolExecutionResult(toolName, argumentsJson, res.Error.Message, false);
                }

                case "notifications_get_failed":
                {
                    var service = scopedProvider.GetRequiredService<INotificationService>();
                    var res = await service.GetFailedPageAsync(new PageRequest { Page = 1, PageSize = 10 });
                    return new AiToolExecutionResult(toolName, argumentsJson, JsonSerializer.Serialize(res.Items), true);
                }

                case "notifications_retry":
                {
                    using var doc = JsonDocument.Parse(argumentsJson);
                    var notificationId = doc.RootElement.GetProperty("notificationId").GetGuid();
                    var service = scopedProvider.GetRequiredService<INotificationService>();
                    var res = await service.RetryAsync(notificationId, userId);
                    return res.IsSuccess
                        ? new AiToolExecutionResult(toolName, argumentsJson, $"Notification {notificationId} successfully re-queued for delivery.", true)
                        : new AiToolExecutionResult(toolName, argumentsJson, res.Error.Message, false);
                }

                default:
                    return new AiToolExecutionResult(toolName, argumentsJson, $"Tool '{toolName}' handler not registered.", false);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing AI tool {ToolName} with args {Arguments}", toolName, argumentsJson);
            return new AiToolExecutionResult(toolName, argumentsJson, $"Execution error: {ex.Message}", false);
        }
    }

    private void RegisterStandardTools()
    {
        // 1. Customer
        _toolDefinitions.Add(new AiToolDefinition(
            Name: "customer_get_portal_data",
            Description: "Retrieves the signed-in customer's active solar lead, proposal details, BOM items, and installation status.",
            AllowedRoles: "Customer",
            ParametersSchemaJson: """{"type": "object", "properties": {}}"""
        ));

        _toolDefinitions.Add(new AiToolDefinition(
            Name: "customer_calculate_sizing",
            Description: "Calculates the recommended rooftop solar system size in kW, panel count, PM Surya Ghar subsidy, and estimated cost based on monthly bill.",
            AllowedRoles: "*",
            ParametersSchemaJson: """
            {
              "type": "object",
              "properties": {
                "monthlyBillRupees": { "type": "number", "description": "Average monthly electricity bill in Indian Rupees (e.g. 3500)" }
              },
              "required": ["monthlyBillRupees"]
            }
            """
        ));

        _toolDefinitions.Add(new AiToolDefinition(
            Name: "customer_pay_quote",
            Description: "Simulates acceptance and advance or full payment for an approved solar proposal, moving installation to the crew schedule.",
            AllowedRoles: "Customer",
            ParametersSchemaJson: """
            {
              "type": "object",
              "properties": {
                "quoteId": { "type": "integer", "description": "The ID of the quote to pay" },
                "paymentType": { "type": "string", "enum": ["Advance", "Full"], "description": "Payment amount type (Advance is 20%)" }
              },
              "required": ["quoteId", "paymentType"]
            }
            """
        ));

        // 2. Technician
        _toolDefinitions.Add(new AiToolDefinition(
            Name: "technician_get_assigned_surveys",
            Description: "Lists all site visits and technical feasibility surveys assigned to the current technician.",
            AllowedRoles: "Technician,Admin",
            ParametersSchemaJson: """{"type": "object", "properties": {}}"""
        ));

        _toolDefinitions.Add(new AiToolDefinition(
            Name: "technician_submit_survey_report",
            Description: "Submits technical findings from the physical site visit: shadow-free roof area, tilt, orientation, cable route distance, and grid suitability.",
            AllowedRoles: "Technician,Admin",
            ParametersSchemaJson: """
            {
              "type": "object",
              "properties": {
                "surveyId": { "type": "integer", "description": "The ID of the survey" },
                "shadowFreeRoofAreaSquareMetres": { "type": "number", "description": "Usable shadow-free rooftop area in square metres" },
                "monthlyBillRupees": { "type": "number", "description": "Actual monthly power bill verified on site" },
                "gridSuitable": { "type": "boolean", "description": "Whether the grid phase and transformer support solar net-metering" },
                "roofDirectionDegrees": { "type": "number", "description": "Azimuth orientation in degrees (180 = True South)" },
                "roofTiltDegrees": { "type": "number", "description": "Roof slope in degrees (typically 15-25)" },
                "cableDistanceMetres": { "type": "number", "description": "Cable route distance in metres from array to distribution board" },
                "notes": { "type": "string", "description": "Technician on-site engineering remarks" }
              },
              "required": ["surveyId", "shadowFreeRoofAreaSquareMetres", "gridSuitable", "roofTiltDegrees", "cableDistanceMetres"]
            }
            """
        ));

        // 3. Sales & Admin
        _toolDefinitions.Add(new AiToolDefinition(
            Name: "sales_get_leads",
            Description: "Retrieves incoming solar leads filtered by status for follow-up and sales qualification.",
            AllowedRoles: "Sales,Admin",
            ParametersSchemaJson: """{"type": "object", "properties": {}}"""
        ));

        _toolDefinitions.Add(new AiToolDefinition(
            Name: "sales_convert_lead",
            Description: "Converts a qualified prospective homeowner lead into an active Customer and Installation project at the Survey stage.",
            AllowedRoles: "Sales,Admin",
            ParametersSchemaJson: """
            {
              "type": "object",
              "properties": {
                "leadId": { "type": "integer", "description": "The ID of the lead to convert" }
              },
              "required": ["leadId"]
            }
            """
        ));

        _toolDefinitions.Add(new AiToolDefinition(
            Name: "admin_schedule_survey",
            Description: "Schedules a physical site visit for an installation and assigns a technician.",
            AllowedRoles: "Admin",
            ParametersSchemaJson: """
            {
              "type": "object",
              "properties": {
                "installationId": { "type": "integer", "description": "The ID of the installation project" },
                "technicianId": { "type": "integer", "description": "The ID of the technician to assign" },
                "scheduledAt": { "type": "string", "format": "date-time", "description": "Scheduled appointment time in ISO 8601 UTC" }
              },
              "required": ["installationId", "technicianId"]
            }
            """
        ));

        _toolDefinitions.Add(new AiToolDefinition(
            Name: "admin_review_survey",
            Description: "Formally approves or rejects a submitted technical site survey report, unlocking quote generation upon approval.",
            AllowedRoles: "Admin",
            ParametersSchemaJson: """
            {
              "type": "object",
              "properties": {
                "surveyId": { "type": "integer", "description": "The ID of the survey" },
                "approved": { "type": "boolean", "description": "True to approve, false to reject" },
                "reviewNotes": { "type": "string", "description": "Reasoning or directions for approval/rejection" }
              },
              "required": ["surveyId", "approved"]
            }
            """
        ));

        _toolDefinitions.Add(new AiToolDefinition(
            Name: "admin_generate_quote",
            Description: "Generates or recalculates the commercial proposal and 9-part Bill of Materials (BOM) for an installation with an approved survey.",
            AllowedRoles: "Admin",
            ParametersSchemaJson: """
            {
              "type": "object",
              "properties": {
                "installationId": { "type": "integer", "description": "The ID of the installation project" },
                "systemCapacityKw": { "type": "number", "description": "Desired system size in kW (1.0 to 5.0). Optional; defaults to survey sizing" },
                "systemType": { "type": "string", "enum": ["OnGrid", "OffGrid"], "description": "OnGrid or OffGrid with battery storage" },
                "notes": { "type": "string", "description": "Commercial remarks" }
              },
              "required": ["installationId"]
            }
            """
        ));

        _toolDefinitions.Add(new AiToolDefinition(
            Name: "admin_send_quote",
            Description: "Sends the approved commercial proposal to the customer so they can review and pay in their Customer Portal.",
            AllowedRoles: "Admin",
            ParametersSchemaJson: """
            {
              "type": "object",
              "properties": {
                "quoteId": { "type": "integer", "description": "The ID of the quote to send" }
              },
              "required": ["quoteId"]
            }
            """
        ));

        _toolDefinitions.Add(new AiToolDefinition(
            Name: "warehouse_get_packing_order",
            Description: "Retrieves the packing order checklist and serialized item requirements for an installation.",
            AllowedRoles: "Admin",
            ParametersSchemaJson: """
            {
              "type": "object",
              "properties": {
                "installationId": { "type": "integer", "description": "The ID of the installation" }
              },
              "required": ["installationId"]
            }
            """
        ));

        _toolDefinitions.Add(new AiToolDefinition(
            Name: "warehouse_update_packing_item",
            Description: "Marks a BOM item as packed and records physical serial number (mandatory for Inverters, Batteries, and Controllers).",
            AllowedRoles: "Admin",
            ParametersSchemaJson: """
            {
              "type": "object",
              "properties": {
                "packingOrderId": { "type": "integer", "description": "The packing order ID" },
                "itemId": { "type": "integer", "description": "The item ID in the packing order" },
                "isPacked": { "type": "boolean", "description": "Whether the item is packed" },
                "serialNumber": { "type": "string", "description": "Physical serial number / barcode" }
              },
              "required": ["packingOrderId", "itemId", "isPacked"]
            }
            """
        ));

        _toolDefinitions.Add(new AiToolDefinition(
            Name: "notifications_get_failed",
            Description: "Lists transactional emails and notifications that failed delivery after 24 hours of retry attempts.",
            AllowedRoles: "Admin",
            ParametersSchemaJson: """{"type": "object", "properties": {}}"""
        ));

        _toolDefinitions.Add(new AiToolDefinition(
            Name: "notifications_retry",
            Description: "Re-queues a failed notification with a fresh 24-hour delivery window.",
            AllowedRoles: "Admin",
            ParametersSchemaJson: """
            {
              "type": "object",
              "properties": {
                "notificationId": { "type": "string", "format": "uuid", "description": "The GUID of the failed notification" }
              },
              "required": ["notificationId"]
            }
            """
        ));
    }
}
