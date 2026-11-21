using System.Security.Claims;
using Application.DTOs.Ai;
using FluentAssertions;
using Infrastructure.Auth;
using Infrastructure.Services.Ai;
using Infrastructure.Settings;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace IntegrationTests.Services;

public class AiServiceTests
{
    private class DummyHostEnv : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Development";
        public string ApplicationName { get; set; } = "Sol.IntegrationTests";
        public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    [Fact]
    public async Task KnowledgeBase_ReturnsSubsidies_WhenSearchingForSubsidy()
    {
        var kb = new KnowledgeBaseService(new DummyHostEnv(), NullLogger<KnowledgeBaseService>.Instance);
        var results = await kb.SearchAsync("What is the PM Surya Ghar subsidy for 3kW?", "Customer");

        results.Should().NotBeEmpty();
        results.First().Content.Should().Contain("78,000");
    }

    [Fact]
    public void ToolRegistry_FiltersTools_BasedOnRole()
    {
        var registry = new DynamicEndpointScanner(NullLogger<DynamicEndpointScanner>.Instance);

        // Customer
        var customerClaims = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(Session.UserIdClaim, "42"),
            new Claim(Session.RoleClaim, Session.CustomerRole)
        ], "TestAuth"));
        var customerTools = registry.GetToolsForUser(customerClaims);
        customerTools.Should().Contain(t => t.Name == "customer_get_portal_data");
        customerTools.Should().NotContain(t => t.Name == "admin_schedule_survey");
        customerTools.Should().NotContain(t => t.Name == "technician_submit_survey_report");

        // Technician
        var techClaims = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(Session.UserIdClaim, "7"),
            new Claim(Session.RoleClaim, "Technician")
        ], "TestAuth"));
        var techTools = registry.GetToolsForUser(techClaims);
        techTools.Should().Contain(t => t.Name == "technician_submit_survey_report");
        techTools.Should().NotContain(t => t.Name == "admin_schedule_survey");

        // Admin
        var adminClaims = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(Session.UserIdClaim, "1"),
            new Claim(Session.RoleClaim, "Admin")
        ], "TestAuth"));
        var adminTools = registry.GetToolsForUser(adminClaims);
        adminTools.Should().Contain(t => t.Name == "admin_schedule_survey");
        adminTools.Should().Contain(t => t.Name == "admin_review_survey");
        adminTools.Should().Contain(t => t.Name == "admin_generate_quote");
    }

    [Fact]
    public async Task AiService_CalculatesSizing_WhenUserAsksForBillSizing()
    {
        var kb = new KnowledgeBaseService(new DummyHostEnv(), NullLogger<KnowledgeBaseService>.Instance);
        var registry = new DynamicEndpointScanner(NullLogger<DynamicEndpointScanner>.Instance);
        var options = Options.Create(new AiOptions { Provider = "Simulation" });
        var service = new AiService(kb, registry, options, null!, new HttpClient(), NullLogger<AiService>.Instance);

        var user = new ClaimsPrincipal(new ClaimsIdentity([new Claim(Session.RoleClaim, "Customer")], "TestAuth"));
        var req = new AiChatRequest([new AiChatMessage("user", "My monthly bill is about 3200 rupees, what size solar system do I need?")]);

        var result = await service.ChatAsync(req, user);

        result.IsSuccess.Should().BeTrue();
        result.Value.Content.Should().Contain("3 kW On-Grid System");
        result.Value.Content.Should().Contain("PM Surya Ghar Subsidy");
        result.Value.Content.Should().Contain("78,000");
    }

    [Fact]
    public async Task AiService_AnswersGeneralSubsidyQuestion()
    {
        var kb = new KnowledgeBaseService(new DummyHostEnv(), NullLogger<KnowledgeBaseService>.Instance);
        var registry = new DynamicEndpointScanner(NullLogger<DynamicEndpointScanner>.Instance);
        var options = Options.Create(new AiOptions { Provider = "Simulation" });
        var service = new AiService(kb, registry, options, null!, new HttpClient(), NullLogger<AiService>.Instance);

        var user = new ClaimsPrincipal(new ClaimsIdentity([new Claim(Session.RoleClaim, "Customer")], "TestAuth"));
        var req = new AiChatRequest([new AiChatMessage("user", "Tell me about PM Surya Ghar subsidies")]);

        var result = await service.ChatAsync(req, user);

        result.IsSuccess.Should().BeTrue();
        result.Value.Content.Should().Contain("PM Surya Ghar: Muft Bijli Yojana");
        result.Value.Content.Should().Contain("30,000");
        result.Value.Content.Should().Contain("60,000");
        result.Value.Content.Should().Contain("78,000");
    }
}
