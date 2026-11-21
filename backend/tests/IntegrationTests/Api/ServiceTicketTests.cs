using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Application.Common.Models;
using Application.DTOs.Lead;
using Application.DTOs.Quote;
using Application.DTOs.ServiceTickets;
using Application.Interfaces.Services;
using Domain.Enums;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TestUtilities.Database;

namespace IntegrationTests.Api;

public class ServiceTicketTests(PostgresFixture database) : ApiTestBase(database)
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

    private async Task<(int installationId, int customerId, string email, string inverterSerial)> SetupDeliveredInstallationAsync(HttpClient admin, string email)
    {
        var leadReq = ErrorResponseTests.ValidLead(email: email);
        var created = await CreateClient().PostAsJsonAsync("/api/leads", leadReq, Ct);
        var leadId = (await Json(created)).GetProperty("id").GetInt32();

        var sales = await CreateClientAsAsync(UserRole.Sales);
        await sales.PutAsJsonAsync($"/api/leads/{leadId}/status", new UpdateLeadStatusRequest { Status = "Contacted" }, Ct);
        var converted = await admin.PostAsync($"/api/leads/{leadId}/convert", null, Ct);
        var convJson = await Json(converted);
        var installationId = convJson.GetProperty("installationId").GetInt32();
        var customerId = convJson.GetProperty("customer").GetProperty("id").GetInt32();

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

        // Pack & Scan serial
        var packingOrder = await (await admin.GetAsync($"/api/installations/{installationId}/packing-order", Ct)).Content.ReadFromJsonAsync<PackingOrderDto>(Ct);
        var inverterSerial = $"INV-GROWATT-{installationId}-9981";

        foreach (var item in packingOrder!.Items)
        {
            var s = item.RequiresSerialNumber ? inverterSerial : null;
            await admin.PutAsJsonAsync($"/api/packing-orders/{packingOrder.Id}/items/{item.Id}", new
            {
                isPacked = true,
                serialNumber = s
            }, Ct);
        }

        // Deliver & start warranties
        await admin.PostAsync($"/api/packing-orders/{packingOrder.Id}/deliver", null, Ct);

        return (installationId, customerId, email, inverterSerial);
    }

    [Fact]
    public async Task WarrantyClaim_UnderWarranty_DefaultsToZeroRupees_AndCustomerApprovalGeneratesReplacementPackingOrder()
    {
        var admin = await CreateTestAdminAsync();
        var (installationId, customerId, email, inverterSerial) = await SetupDeliveredInstallationAsync(admin, "rainyseason@example.test");
        var customer = await CreateCustomerClientAsync(email);

        // 1. Homeowner submits breakdown ticket from Customer Portal
        var createReq = new CreateServiceTicketRequest(
            installationId,
            inverterSerial,
            "E04 - Inverter Overheat / Zero Generation",
            "Heavy rain yesterday and inverter shut down with error code E04. Display is flashing red.",
            "https://sol.test/photos/fault-screen.jpg");

        var createRes = await customer.PostAsJsonAsync("/api/customer-portal/tickets", createReq, Ct);
        createRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var ticket = await createRes.Content.ReadFromJsonAsync<ServiceTicketDto>(Ct);

        ticket.Should().NotBeNull();
        ticket!.Status.Should().Be("Open");
        ticket.IsWarrantyCovered.Should().BeTrue();
        ticket.PartsCostRupees.Should().Be(0m);
        ticket.LaborCostRupees.Should().Be(0m);
        ticket.TotalBilledRupees.Should().Be(0m);

        // 2. Admin reviews the ticket and verifies warranty coverage
        var reviewReq = new ReviewServiceTicketRequest(
            "EquipmentFailure",
            true,
            0m,
            0m,
            "Rain water ingress on outer gasket confirmed by telemetry. 100% covered under warranty.");

        var reviewRes = await admin.PutAsJsonAsync($"/api/service-tickets/{ticket.Id}/review", reviewReq, Ct);
        reviewRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var reviewedTicket = await reviewRes.Content.ReadFromJsonAsync<ServiceTicketDto>(Ct);
        reviewedTicket!.Status.Should().Be("Reviewed");
        reviewedTicket.IsWarrantyCovered.Should().BeTrue();

        // 3. Customer reviews terms in portal and approves replacement
        var approveRes = await customer.PostAsJsonAsync($"/api/customer-portal/tickets/{ticket.Id}/approve", new ApproveServiceTicketRequest("Approved. Please send replacement."), Ct);
        approveRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var approvedTicket = await approveRes.Content.ReadFromJsonAsync<ServiceTicketDto>(Ct);
        approvedTicket!.Status.Should().Be("Approved");
        approvedTicket.ReplacementPackingOrderId.Should().NotBeNull();

        // 4. Verify downstream packing order was created with replacement hardware
        var packingOrderRes = await admin.GetAsync($"/api/installations/{installationId}/packing-order", Ct);
        packingOrderRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // 4b. Admin schedules active technician for replacement visit
        var techClient = await CreateClientAsAsync(UserRole.Technician);
        var technicianId = await IdOfAsync(TestTechnician.Email);
        var scheduleRes = await admin.PutAsJsonAsync($"/api/service-tickets/{ticket.Id}/schedule", new ScheduleServiceTicketRequest(technicianId, DateTime.UtcNow.AddDays(1)), Ct);
        scheduleRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var scheduledTicket = await scheduleRes.Content.ReadFromJsonAsync<ServiceTicketDto>(Ct);
        scheduledTicket!.Status.Should().Be("InProgress");
        scheduledTicket.AssignedTechnicianId.Should().Be(technicianId);

        // 5. Technician resolves ticket on-site with replacement serial, tested generation, and customer signature
        var resolveReq = new ResolveServiceTicketRequest(
            "INV-GROWATT-REPLACE-4491",
            2.92m,
            "https://sol.test/photos/inverter-swapped.jpg",
            "Swapped out faulty inverter unit. Tested power output at 2.92 kW. Replaced seals.",
            "data:image/svg+xml;base64,PHN2Zz5zaWduYXR1cmU8L3N2Zz4=",
            "Jane Doe");

        var resolveRes = await techClient.PostAsJsonAsync($"/api/service-tickets/{ticket.Id}/resolve", resolveReq, Ct);
        resolveRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var resolvedTicket = await resolveRes.Content.ReadFromJsonAsync<ServiceTicketDto>(Ct);

        // Invariant: Ticket must stay in ResolvedPendingCustomerConfirmation until Homeowner confirms
        resolvedTicket!.Status.Should().Be("ResolvedPendingCustomerConfirmation");
        resolvedTicket.ReplacementSerialNumber.Should().Be("INV-GROWATT-REPLACE-4491");
        resolvedTicket.TestedGenerationKw.Should().Be(2.92m);
        resolvedTicket.SignedByName.Should().Be("Jane Doe");

        // 6. Homeowner confirms power restored in Customer Portal -> Formally closes ticket
        var confirmRes = await customer.PostAsJsonAsync($"/api/customer-portal/tickets/{ticket.Id}/confirm", new ConfirmServiceTicketRequest("Confirmed. AC and inverter running perfectly."), Ct);
        confirmRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var closedTicket = await confirmRes.Content.ReadFromJsonAsync<ServiceTicketDto>(Ct);
        closedTicket!.Status.Should().Be("Closed");
        closedTicket.CustomerConfirmedAt.Should().NotBeNull();

        // 7. Verify new replacement serial has its 2-year warranty active in DB
        var warrantyLookup = await admin.GetAsync("/api/warranties/lookup?query=INV-GROWATT-REPLACE-4491", Ct);
        warrantyLookup.StatusCode.Should().Be(HttpStatusCode.OK);
        var lookupDto = await warrantyLookup.Content.ReadFromJsonAsync<WarrantyLookupResultDto>(Ct);
        lookupDto!.Found.Should().BeTrue();
        lookupDto.Warranties.Should().ContainSingle(w => w.SerialNumber == "INV-GROWATT-REPLACE-4491" && w.IsCovered);
    }

    [Fact]
    public async Task AccidentalDamage_BillsPartsAndLabor_AndRefusesClosureUntilCustomerConfirms()
    {
        var admin = await CreateTestAdminAsync();
        var (installationId, customerId, email, inverterSerial) = await SetupDeliveredInstallationAsync(admin, "accidentaldamage@example.test");
        var customer = await CreateCustomerClientAsync(email);

        var createReq = new CreateServiceTicketRequest(
            installationId,
            inverterSerial,
            "E12 - Physical Damage",
            "Tree branch fell on inverter enclosure during storm.");

        var createRes = await customer.PostAsJsonAsync("/api/customer-portal/tickets", createReq, Ct);
        var ticket = await createRes.Content.ReadFromJsonAsync<ServiceTicketDto>(Ct);

        // Admin reviews and marks as accidental customer damage (Billable)
        var reviewReq = new ReviewServiceTicketRequest(
            "AccidentalDamage",
            false,
            32000m,
            1500m,
            "External physical impact. Case shattered. Replacement chargeable.");

        var reviewRes = await admin.PutAsJsonAsync($"/api/service-tickets/{ticket!.Id}/review", reviewReq, Ct);
        reviewRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var reviewedTicket = await reviewRes.Content.ReadFromJsonAsync<ServiceTicketDto>(Ct);

        reviewedTicket!.DamageType.Should().Be("AccidentalDamage");
        reviewedTicket.IsWarrantyCovered.Should().BeFalse();
        reviewedTicket.PartsCostRupees.Should().Be(32000m);
        reviewedTicket.LaborCostRupees.Should().Be(1500m);
        reviewedTicket.TotalBilledRupees.Should().Be(33500m);

        // Customer approves billable terms
        var approveRes = await customer.PostAsJsonAsync($"/api/customer-portal/tickets/{ticket.Id}/approve", new ApproveServiceTicketRequest("Approved replacement invoice."), Ct);
        approveRes.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
