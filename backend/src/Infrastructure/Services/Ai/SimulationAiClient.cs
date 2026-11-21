using System.Text.Json;
using System.Text.RegularExpressions;
using Application.DTOs.Ai;

namespace Infrastructure.Services.Ai;

public class SimulationAiClient : ILlmClient
{
    public Task<LlmResponse> GenerateAsync(string systemPrompt, IReadOnlyList<AiChatMessage> messages, IReadOnlyList<AiToolDefinition> tools, CancellationToken ct = default)
    {
        var lastMsg = messages.LastOrDefault(m => m.Role == "user")?.Content ?? "";
        var query = lastMsg.ToLowerInvariant();

        var toolCalls = new List<AiToolCall>();

        // 1. Check for calculate sizing intent
        if ((query.Contains("bill") || query.Contains("sizing") || query.Contains("calculate") || query.Contains("recommend"))
            && tools.Any(t => t.Name == "customer_calculate_sizing"))
        {
            var match = Regex.Match(query, @"\d+");
            decimal bill = match.Success && decimal.TryParse(match.Value, out var parsed) ? parsed : 3000m;
            toolCalls.Add(new AiToolCall("calc_1", "customer_calculate_sizing", JsonSerializer.Serialize(new { monthlyBillRupees = bill })));
            return Task.FromResult(new LlmResponse("", toolCalls));
        }

        // 2. Check for portal data / status intent
        if ((query.Contains("status") || query.Contains("my quote") || query.Contains("progress") || query.Contains("portal") || query.Contains("tracking"))
            && tools.Any(t => t.Name == "customer_get_portal_data"))
        {
            toolCalls.Add(new AiToolCall("portal_1", "customer_get_portal_data", "{}"));
            return Task.FromResult(new LlmResponse("", toolCalls));
        }

        // 3. Convert lead intent
        if (query.Contains("convert") && query.Contains("lead") && tools.Any(t => t.Name == "sales_convert_lead"))
        {
            var match = Regex.Match(query, @"\d+");
            var leadId = match.Success ? int.Parse(match.Value) : 1;
            toolCalls.Add(new AiToolCall("convert_1", "sales_convert_lead", JsonSerializer.Serialize(new { leadId })));
            return Task.FromResult(new LlmResponse("", toolCalls));
        }

        // 4. Review / Approve survey intent
        if ((query.Contains("approve") || query.Contains("review")) && query.Contains("survey") && tools.Any(t => t.Name == "admin_review_survey"))
        {
            var match = Regex.Match(query, @"\d+");
            var surveyId = match.Success ? int.Parse(match.Value) : 1;
            var approved = !query.Contains("reject");
            toolCalls.Add(new AiToolCall("review_1", "admin_review_survey", JsonSerializer.Serialize(new { surveyId, approved, reviewNotes = "Approved via AI Assistant" })));
            return Task.FromResult(new LlmResponse("", toolCalls));
        }

        // 5. Generate quote intent
        if ((query.Contains("generate quote") || query.Contains("create quote") || query.Contains("make quote")) && tools.Any(t => t.Name == "admin_generate_quote"))
        {
            var match = Regex.Match(query, @"\d+");
            var installationId = match.Success ? int.Parse(match.Value) : 1;
            toolCalls.Add(new AiToolCall("quote_1", "admin_generate_quote", JsonSerializer.Serialize(new { installationId, systemType = "OnGrid" })));
            return Task.FromResult(new LlmResponse("", toolCalls));
        }

        // 6. Technician surveys intent
        if ((query.Contains("assigned") || query.Contains("my survey") || query.Contains("visits")) && tools.Any(t => t.Name == "technician_get_assigned_surveys"))
        {
            toolCalls.Add(new AiToolCall("tech_1", "technician_get_assigned_surveys", "{}"));
            return Task.FromResult(new LlmResponse("", toolCalls));
        }

        // 7. General Knowledge synthesis from systemPrompt context
        string response;
        if (query.Contains("subsidy") || query.Contains("surya ghar") || query.Contains("pm"))
        {
            response = "Under the central **PM Surya Ghar: Muft Bijli Yojana**, residential consumers in India receive direct government subsidies:\n\n" +
                       "• **1 kW System**: ₹30,000\n" +
                       "• **2 kW System**: ₹60,000\n" +
                       "• **3 kW and above**: ₹78,000 (maximum statutory cap)\n\n" +
                       "Subsidies are credited directly to your bank account after technical DISCOM net-meter commissioning. Off-grid systems do not qualify for central grid subsidies.";
        }
        else if (query.Contains("package") || query.Contains("size") || query.Contains("capacity"))
        {
            response = "Sol provides engineered solar systems tailored to your roof area and power consumption:\n\n" +
                       "• **1 kW**: Ideal for monthly bills < ₹1,500 (~8 sq m roof area required).\n" +
                       "• **2 kW**: For monthly bills ₹1,500 – ₹2,500 (~16 sq m roof area required).\n" +
                       "• **3 kW (Most Popular)**: For monthly bills ₹2,500 – ₹4,000 (~24 sq m roof area required).\n" +
                       "• **5 kW**: For heavy loads and monthly bills > ₹5,500 (~40 sq m roof area required).\n\n" +
                       "All packages feature high-efficiency 550W Half-Cut Mono-PERC modules and elevated wind-resistant mounting structures.";
        }
        else if (query.Contains("survey") || query.Contains("process") || query.Contains("steps"))
        {
            response = "The Sol operational workflow follows a strict 5-stage engineering process:\n\n" +
                       "1. **Enquiry & Qualification**: Review your electricity bill and property details.\n" +
                       "2. **Site Feasibility Survey**: A technician visits to measure shadow-free roof area, tilt angle, orientation (True South), and cable run.\n" +
                       "3. **Approved Proposal & BOM**: Once the survey is formally approved, our automated sizing engine generates an itemized 9-part Bill of Materials.\n" +
                       "4. **Warehouse Packing & Serial Tracking**: Components (inverter, panels, safety switchgear) are checked and serialized.\n" +
                       "5. **Installation & Commissioning**: Turnkey assembly, generation testing, and net-metering synchronization with your DISCOM.";
        }
        else
        {
            response = "Hello! I am your Sol AI assistant. I can help calculate solar sizing and PM Surya Ghar subsidies, track your project progress, or assist with site surveys and quotation approvals. How can I help you today?";
        }

        return Task.FromResult(new LlmResponse(response, []));
    }
}
