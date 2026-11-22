using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Application.Common.Models;
using Application.DTOs.Financial;
using Application.DTOs.Lead;
using Application.DTOs.Quote;
using Application.DTOs.Subsidy;
using Application.Interfaces.Services;
using Domain.Enums;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using TestUtilities.Database;

namespace IntegrationTests.Api;

public class DirectorFinancialsTests(PostgresFixture database) : ApiTestBase(database)
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;
    private static async Task<JsonElement> Json(HttpResponseMessage response) => await response.Content.ReadFromJsonAsync<JsonElement>(Ct);
    private readonly ConcurrentQueue<EmailMessage> _sentEmails = new();

    private sealed class CaptureSender(ConcurrentQueue<EmailMessage> sent) : IEmailSender
    {
        public Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
        {
            sent.Enqueue(message);
            return Task.CompletedTask;
        }
    }

    private async Task<HttpClient> CreateCustomerClientAsync(string email)
    {
        var customer = CreateClient();
        var otpRes = await customer.PostAsJsonAsync("/api/customer-auth/request-otp", new { email }, Ct);
        otpRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var message = _sentEmails.ToArray().Last(m => m.ToAddress == email);
        var code = Regex.Match(message.TextBody, @"Your code: ([0-9]{6})").Groups[1].Value;
        var verify = await customer.PostAsJsonAsync("/api/customer-auth/verify-otp", new { email, code }, Ct);
        verify.StatusCode.Should().Be(HttpStatusCode.OK);
        var session = verify.Headers.GetValues("Set-Cookie").Single().Split(';')[0];
        customer.DefaultRequestHeaders.Add("Cookie", session);
        return customer;
    }

    private Task<HttpClient> CreateTestAdminAsync() =>
        CreateClientAsAsync(UserRole.Admin, services => services.AddScoped<IEmailSender>(_ => new CaptureSender(_sentEmails)));

    private async Task<int> SetupActiveInstallationAsync(HttpClient admin, string email)
    {
        var leadReq = ErrorResponseTests.ValidLead(email: email);
        var created = await CreateClient().PostAsJsonAsync("/api/leads", leadReq, Ct);
        var leadId = (await Json(created)).GetProperty("id").GetInt32();

        var sales = await CreateClientAsAsync(UserRole.Sales);
        await sales.PutAsJsonAsync($"/api/leads/{leadId}/status", new UpdateLeadStatusRequest { Status = "Contacted" }, Ct);
        var converted = await admin.PostAsync($"/api/leads/{leadId}/convert", null, Ct);
        var convJson = await Json(converted);
        var installationId = convJson.GetProperty("installationId").GetInt32();

        // Survey flow
        var techClient = await CreateClientAsAsync(UserRole.Technician);
        var technicianId = await IdOfAsync(TestTechnician.Email);
        var surveyRes = await admin.PostAsJsonAsync($"/api/installations/{installationId}/surveys", new { technicianId, scheduledAt = "2026-11-24T10:00:00+05:30" }, Ct);
        var surveyId = (await Json(surveyRes)).GetProperty("id").GetInt32();

        await techClient.PutAsJsonAsync($"/api/surveys/{surveyId}/report", new
        {
            shadowFreeRoofAreaSquareMetres = 40.5m,
            monthlyBillRupees = 3200m,
            gridSuitable = true,
            roofDirectionDegrees = 180m,
            roofTiltDegrees = 25m,
            cableDistanceMetres = 15m,
            notes = "Site ready"
        }, Ct);

        await admin.PostAsJsonAsync($"/api/surveys/{surveyId}/review", new { approved = true, notes = "Approved" }, Ct);

        // Quote & Pay
        var quoteRes = await admin.PostAsJsonAsync($"/api/installations/{installationId}/quote", new { systemCapacityKw = 3.0m, systemType = "OnGrid" }, Ct);
        var quoteId = (await Json(quoteRes)).GetProperty("id").GetInt32();
        await admin.PutAsync($"/api/quotes/{quoteId}/send", null, Ct);

        var customerClient = await CreateCustomerClientAsync(email);
        await customerClient.PostAsJsonAsync($"/api/customer-portal/quotes/{quoteId}/pay", new CustomerPayQuoteRequest("Advance"), Ct);

        return installationId;
    }

    [Fact]
    public async Task DirectorOverview_Admin_ReturnsCompleteFinancialMetrics()
    {
        // Arrange
        var admin = await CreateTestAdminAsync();
        var email = $"director.owner.{Guid.NewGuid():N}@example.com";
        await SetupActiveInstallationAsync(admin, email);

        // Act
        var response = await admin.GetAsync("/api/director/overview?period=all", Ct);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var overview = await response.Content.ReadFromJsonAsync<DirectorOverviewDto>(Ct);
        overview.Should().NotBeNull();
        overview!.Summary.Should().NotBeNull();
        overview.Summary.TotalJobsCount.Should().BeGreaterThan(0);
        overview.JobEconomics.Should().NotBeEmpty();
        overview.SubsidyPipeline.Should().NotBeNull();
        overview.OperationsBacklog.Should().NotBeNull();
        overview.CrewPayroll.Should().NotBeNull();
    }

    [Fact]
    public async Task DirectorOverview_Technician_IsForbidden()
    {
        var tech = await CreateClientAsAsync(UserRole.Technician);
        var response = await tech.GetAsync("/api/director/overview", Ct);
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task DirectorExportCsv_Admin_ReturnsValidCsvFile()
    {
        // Arrange
        var admin = await CreateTestAdminAsync();
        var email = $"director.csv.{Guid.NewGuid():N}@example.com";
        await SetupActiveInstallationAsync(admin, email);

        // Act
        var response = await admin.GetAsync("/api/director/export/csv?period=all", Ct);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType?.MediaType.Should().Be("text/csv");
        var csv = await response.Content.ReadAsStringAsync(Ct);
        csv.Should().Contain("Installation ID,Customer Name,City,State");
        csv.Should().Contain("--- PM SURYA GHAR SUBSIDY PIPELINE ---");
        csv.Should().Contain("--- CREW PAYROLL LEDGER ---");
    }

    [Fact]
    public async Task SubsidyWorkflow_AdminCanCreateAndUpdateClaimStatus()
    {
        // Arrange
        var admin = await CreateTestAdminAsync();
        var email = $"subsidy.cust.{Guid.NewGuid():N}@example.com";
        var installationId = await SetupActiveInstallationAsync(admin, email);

        // 1. Create claim
        var createRequest = new CreateSubsidyClaimRequest(
            SubsidyAmountRupees: 78000m,
            ApplicationReference: "PM-SG-2026-TEST-9901",
            Notes: "National portal application filed"
        );

        var createResponse = await admin.PostAsJsonAsync($"/api/installations/{installationId}/subsidy", createRequest, Ct);
        createResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var createdClaim = await createResponse.Content.ReadFromJsonAsync<SubsidyClaimDto>(Ct);
        createdClaim.Should().NotBeNull();
        createdClaim!.Status.Should().Be("DocumentsSubmitted");
        createdClaim.SubsidyAmountRupees.Should().Be(78000m);

        // 2. Update status to InspectionCleared
        var updateRequest = new UpdateSubsidyStatusRequest(
            Status: "InspectionCleared",
            DisbursementReference: null,
            Notes: "Utility DISCOM net meter verified"
        );
        var updateResponse = await admin.PutAsJsonAsync($"/api/subsidies/{createdClaim.Id}/status", updateRequest, Ct);
        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var clearedClaim = await updateResponse.Content.ReadFromJsonAsync<SubsidyClaimDto>(Ct);
        clearedClaim!.Status.Should().Be("InspectionCleared");
        clearedClaim.ClearedAt.Should().NotBeNull();

        // 3. Update status to Disbursed
        var disburseRequest = new UpdateSubsidyStatusRequest(
            Status: "Disbursed",
            DisbursementReference: "DBT-NEFT-20261122-881",
            Notes: "DBT subsidy credited to customer bank"
        );
        var disburseResponse = await admin.PutAsJsonAsync($"/api/subsidies/{createdClaim.Id}/status", disburseRequest, Ct);
        disburseResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var disbursedClaim = await disburseResponse.Content.ReadFromJsonAsync<SubsidyClaimDto>(Ct);
        disbursedClaim!.Status.Should().Be("Disbursed");
        disbursedClaim.DisbursedAt.Should().NotBeNull();
        disbursedClaim.DisbursementReference.Should().Be("DBT-NEFT-20261122-881");
    }
}
