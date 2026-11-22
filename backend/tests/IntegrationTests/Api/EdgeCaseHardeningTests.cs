using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Application.Common.Models;
using Application.DTOs.Lead;
using Application.DTOs.Quote;
using Application.DTOs.ServiceTickets;
using Application.DTOs.Installations;
using Application.Interfaces.Services;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TestUtilities.Database;
using WebAPI.Controllers;

namespace IntegrationTests.Api;

public class EdgeCaseHardeningTests(PostgresFixture database) : ApiTestBase(database)
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

    private async Task<int> SetupSurveyApprovedInstallationAsync(HttpClient admin, string email)
    {
        var leadReq = ErrorResponseTests.ValidLead(email: email);
        var created = await CreateClient().PostAsJsonAsync("/api/leads", leadReq, Ct);
        var leadId = (await Json(created)).GetProperty("id").GetInt32();

        var sales = await CreateClientAsAsync(UserRole.Sales);
        await sales.PutAsJsonAsync($"/api/leads/{leadId}/status", new UpdateLeadStatusRequest { Status = "Contacted" }, Ct);
        var converted = await admin.PostAsync($"/api/leads/{leadId}/convert", null, Ct);
        var convJson = await Json(converted);
        var installationId = convJson.GetProperty("installationId").GetInt32();

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
        return installationId;
    }

    [Fact]
    public async Task ReceiptAttachment_CustomerCanAttachReceiptImageOnPayment()
    {
        // Arrange
        var admin = await CreateTestAdminAsync();
        var email = $"customer.receipt.{Guid.NewGuid():N}@example.com";
        var installationId = await SetupSurveyApprovedInstallationAsync(admin, email);

        var quoteRes = await admin.PostAsJsonAsync($"/api/installations/{installationId}/quote", new { systemCapacityKw = 3.0m, systemType = "OnGrid" }, Ct);
        var quoteId = (await Json(quoteRes)).GetProperty("id").GetInt32();
        await admin.PutAsync($"/api/quotes/{quoteId}/send", null, Ct);

        var customer = await CreateCustomerClientAsync(email);
        const string mockReceiptBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...";

        // Act: Customer accepts and pays with receipt photo
        var payReq = new CustomerPayQuoteRequest("Advance", mockReceiptBase64);
        var payRes = await customer.PostAsJsonAsync($"/api/customer-portal/quotes/{quoteId}/pay", payReq, Ct);

        // Assert
        payRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var quote = await payRes.Content.ReadFromJsonAsync<QuoteDto>(Ct);
        quote.Should().NotBeNull();
        quote!.PaymentStatus.Should().Be("AdvancePaid");
        quote.ReceiptPhotoUrl.Should().Be(mockReceiptBase64);

        // Also verify quote retrieved via GET returns the receipt
        var getQuoteRes = await customer.GetAsync($"/api/customer-portal/quotes/{quoteId}", Ct);
        var fetchedQuote = await getQuoteRes.Content.ReadFromJsonAsync<QuoteDto>(Ct);
        fetchedQuote!.ReceiptPhotoUrl.Should().Be(mockReceiptBase64);
    }

    [Fact]
    public async Task DuplicateSerialNumber_PackingOrder_IsRejectedWhenSerialBelongsToAnotherSystem()
    {
        // Arrange: Existing active warranty with serial number
        var existingSerial = $"INV-GROWATT-{Guid.NewGuid():N}"[..20].ToUpperInvariant();
        var admin = await CreateTestAdminAsync();
        var email1 = $"system1.{Guid.NewGuid():N}@example.com";
        var inst1 = await SetupSurveyApprovedInstallationAsync(admin, email1);

        Context.Warranties.Add(new Warranty
        {
            InstallationId = inst1,
            CustomerId = 1,
            ItemName = "3.3 kVA Inverter",
            Category = BOMCategory.Inverter,
            SerialNumber = existingSerial,
            WarrantyYears = 2,
            StartDate = DateTime.UtcNow.AddMonths(-2),
            ExpiryDate = DateTime.UtcNow.AddMonths(22),
            Status = WarrantyStatus.Active,
            CreatedAt = DateTime.UtcNow
        });
        await Context.SaveChangesAsync(Ct);

        // Setup System 2 with accepted quote and packing order
        var email2 = $"system2.{Guid.NewGuid():N}@example.com";
        var inst2 = await SetupSurveyApprovedInstallationAsync(admin, email2);
        var quoteRes = await admin.PostAsJsonAsync($"/api/installations/{inst2}/quote", new { systemCapacityKw = 3.0m, systemType = "OnGrid" }, Ct);
        var quoteId = (await Json(quoteRes)).GetProperty("id").GetInt32();
        await admin.PutAsync($"/api/quotes/{quoteId}/send", null, Ct);

        var cust2 = await CreateCustomerClientAsync(email2);
        await cust2.PostAsJsonAsync($"/api/customer-portal/quotes/{quoteId}/pay", new CustomerPayQuoteRequest("Advance"), Ct);

        var packingOrder = await (await admin.GetAsync($"/api/installations/{inst2}/packing-order", Ct)).Content.ReadFromJsonAsync<PackingOrderDto>(Ct);
        var inverterItem = packingOrder!.Items.First(i => i.RequiresSerialNumber);

        // Act: Try to assign the duplicate serial number from System 1
        var updateRes = await admin.PutAsJsonAsync($"/api/packing-orders/{packingOrder.Id}/items/{inverterItem.Id}", new
        {
            isPacked = true,
            serialNumber = existingSerial
        }, Ct);

        // Assert: Conflict rejected
        updateRes.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var problem = await Json(updateRes);
        problem.GetProperty("code").GetString().Should().Be("packing_order.duplicate_serial");
    }

    [Fact]
    public async Task CommissioningProof_InvalidHours_IsRejected()
    {
        var admin = await CreateTestAdminAsync();
        var email = $"proof.hours.{Guid.NewGuid():N}@example.com";
        var installationId = await SetupSurveyApprovedInstallationAsync(admin, email);

        // Act: WorkCompletedAt is earlier than WorkStartedAt
        var now = DateTime.UtcNow;
        var invalidProofReq = new SubmitInstallationProofRequest
        {
            WorkStartedAt = now.AddHours(2),
            WorkCompletedAt = now.AddHours(1), // earlier than start!
            SystemCapacityKw = 3.3m,
            TestedGenerationKw = 2.85m,
            GridConnected = true,
            PanelArrayPhotoUrl = "data:image/svg+xml;utf8,<svg></svg>",
            CustomerSignatureData = "data:image/png;base64,test-signature",
            SignedByName = "Customer"
        };

        var response = await admin.PostAsJsonAsync($"/api/installations/{installationId}/proof", invalidProofReq, Ct);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await Json(response);
        problem.GetProperty("code").GetString().Should().Be("validation_failed");
    }

    [Fact]
    public async Task CommissioningProof_EmptySignature_IsRejected()
    {
        var admin = await CreateTestAdminAsync();
        var email = $"proof.sig.{Guid.NewGuid():N}@example.com";
        var installationId = await SetupSurveyApprovedInstallationAsync(admin, email);

        // Act: Missing customer signature data
        var now = DateTime.UtcNow;
        var invalidProofReq = new SubmitInstallationProofRequest
        {
            WorkStartedAt = now.AddHours(-6),
            WorkCompletedAt = now,
            SystemCapacityKw = 3.3m,
            TestedGenerationKw = 2.85m,
            GridConnected = true,
            CustomerSignatureData = "", // empty!
            SignedByName = "Customer"
        };

        var response = await admin.PostAsJsonAsync($"/api/installations/{installationId}/proof", invalidProofReq, Ct);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await Json(response);
        problem.GetProperty("code").GetString().Should().Be("validation_failed");
    }
}
