using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Application.Common.Models;
using Application.DTOs.Lead;
using Application.DTOs.Quote;
using Application.Interfaces.Services;
using Domain.Enums;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TestUtilities.Database;

namespace IntegrationTests.Api;

public class DispatchAndWarrantyTests(PostgresFixture database) : ApiTestBase(database)
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

    private async Task<(int installationId, int customerId, string email)> SetupInstallationWithApprovedSurvey(HttpClient admin, string email)
    {
        var leadReq = ErrorResponseTests.ValidLead(email: email);
        var created = await CreateClient().PostAsJsonAsync("/api/leads", leadReq, Ct);
        created.StatusCode.Should().Be(HttpStatusCode.Created);
        var leadId = (await Json(created)).GetProperty("id").GetInt32();

        await admin.PutAsJsonAsync($"/api/leads/{leadId}/status", new UpdateLeadStatusRequest { Status = "Contacted" }, Ct);
        var converted = await admin.PostAsync($"/api/leads/{leadId}/convert", null, Ct);
        converted.StatusCode.Should().Be(HttpStatusCode.OK);
        var convJson = await Json(converted);
        var installationId = convJson.GetProperty("installationId").GetInt32();
        var customerId = convJson.GetProperty("customer").GetProperty("id").GetInt32();

        // Schedule and report survey
        var techClient = await CreateClientAsAsync(UserRole.Technician);
        var technicianId = await IdOfAsync(TestTechnician.Email);
        var surveyRes = await admin.PostAsJsonAsync($"/api/installations/{installationId}/surveys", new { technicianId, scheduledAt = "2026-11-24T10:00:00+05:30" }, Ct);
        surveyRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var surveyId = (await Json(surveyRes)).GetProperty("id").GetInt32();

        await techClient.PutAsJsonAsync($"/api/surveys/{surveyId}/report", new
        {
            shadowFreeRoofAreaSquareMetres = 40.5m,
            monthlyBillRupees = 3200m,
            gridSuitable = true,
            roofDirectionDegrees = 180m,
            roofTiltDegrees = 25m,
            cableDistanceMetres = 15m,
            notes = "Site ready for installation"
        }, Ct);

        // Review & Approve
        await admin.PostAsJsonAsync($"/api/surveys/{surveyId}/review", new { approved = true, notes = "Approved" }, Ct);
        return (installationId, customerId, email);
    }

    private Task<HttpClient> CreateTestAdminAsync() =>
        CreateClientAsAsync(UserRole.Admin, services => services.AddScoped<IEmailSender>(_ => new CaptureSender(_sentEmails)));

    [Fact]
    public async Task DispatchGate_EnforcesPackingAndHighValueSerialNumbers()
    {
        var admin = await CreateTestAdminAsync();
        var (installationId, customerId, email) = await SetupInstallationWithApprovedSurvey(admin, "dispatchgate@example.test");

        // Generate and send quote
        var quoteRes = await admin.PostAsJsonAsync($"/api/installations/{installationId}/quote", new { systemCapacityKw = 3.0m, systemType = "OnGrid" }, Ct);
        quoteRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var quoteId = (await Json(quoteRes)).GetProperty("id").GetInt32();
        await admin.PutAsync($"/api/quotes/{quoteId}/send", null, Ct);

        // Customer pays advance via portal
        var customerClient = await CreateCustomerClientAsync(email);
        var payRes = await customerClient.PostAsJsonAsync($"/api/customer-portal/quotes/{quoteId}/pay", new CustomerPayQuoteRequest("Advance"), Ct);
        payRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // Fetch Packing Order
        var packingRes = await admin.GetAsync($"/api/installations/{installationId}/packing-order", Ct);
        packingRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var packingOrder = await packingRes.Content.ReadFromJsonAsync<PackingOrderDto>(Ct);
        packingOrder.Should().NotBeNull();
        packingOrder!.Status.Should().Be("Pending");

        // Attempt Dispatch immediately while unpacked -> MUST FAIL
        var dispatchFail1 = await admin.PostAsync($"/api/packing-orders/{packingOrder.Id}/dispatch", null, Ct);
        dispatchFail1.StatusCode.Should().Be(HttpStatusCode.Conflict);

        // Pack items without serial on inverter -> MUST FAIL
        foreach (var item in packingOrder.Items)
        {
            await admin.PutAsJsonAsync($"/api/packing-orders/{packingOrder.Id}/items/{item.Id}", new
            {
                isPacked = true,
                serialNumber = (string?)null
            }, Ct);
        }

        var dispatchFail2 = await admin.PostAsync($"/api/packing-orders/{packingOrder.Id}/dispatch", null, Ct);
        dispatchFail2.StatusCode.Should().Be(HttpStatusCode.Conflict);

        // Now provide serial number for required item (Inverter)
        var inverterItem = packingOrder.Items.First(i => i.RequiresSerialNumber);
        await admin.PutAsJsonAsync($"/api/packing-orders/{packingOrder.Id}/items/{inverterItem.Id}", new
            {
                isPacked = true,
                serialNumber = "INV-GROWATT-TEST-3391"
            }, Ct);

        // Dispatch should succeed
        var dispatchSuccess = await admin.PostAsync($"/api/packing-orders/{packingOrder.Id}/dispatch", null, Ct);
        dispatchSuccess.StatusCode.Should().Be(HttpStatusCode.OK);
        var dispatchedDto = await dispatchSuccess.Content.ReadFromJsonAsync<PackingOrderDto>(Ct);
        dispatchedDto!.Status.Should().Be("Dispatched");
        dispatchedDto.DispatchedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task Delivery_StartsWarrantyClocks_AndSubSecondLookupSucceeds()
    {
        var admin = await CreateTestAdminAsync();
        var (installationId, customerId, email) = await SetupInstallationWithApprovedSurvey(admin, "deliverywarranty@example.test");

        // Quote & Pay
        var quoteRes = await admin.PostAsJsonAsync($"/api/installations/{installationId}/quote", new { systemCapacityKw = 3.0m, systemType = "OnGrid" }, Ct);
        var quoteId = (await Json(quoteRes)).GetProperty("id").GetInt32();
        await admin.PutAsync($"/api/quotes/{quoteId}/send", null, Ct);

        var customerClient = await CreateCustomerClientAsync(email);
        await customerClient.PostAsJsonAsync($"/api/customer-portal/quotes/{quoteId}/pay", new CustomerPayQuoteRequest("Advance"), Ct);

        var packingOrder = await (await admin.GetAsync($"/api/installations/{installationId}/packing-order", Ct)).Content.ReadFromJsonAsync<PackingOrderDto>(Ct);

        // Pack all and serialize inverter
        foreach (var item in packingOrder!.Items)
        {
            var serial = item.RequiresSerialNumber ? "INV-GROWATT-SER-5510" : null;
            await admin.PutAsJsonAsync($"/api/packing-orders/{packingOrder.Id}/items/{item.Id}", new
            {
                isPacked = true,
                serialNumber = serial
            }, Ct);
        }

        // Deliver directly (auto-dispatches if needed and confirms delivery)
        var deliverRes = await admin.PostAsync($"/api/packing-orders/{packingOrder.Id}/deliver", null, Ct);
        deliverRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var deliveredDto = await deliverRes.Content.ReadFromJsonAsync<PackingOrderDto>(Ct);
        deliveredDto!.Status.Should().Be("Delivered");
        deliveredDto.DeliveredAt.Should().NotBeNull();

        // Check Warranties generated for Installation
        var warrantiesRes = await admin.GetAsync($"/api/installations/{installationId}/warranties", Ct);
        warrantiesRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var warranties = await warrantiesRes.Content.ReadFromJsonAsync<List<WarrantyDto>>(Ct);
        warranties.Should().NotBeNull();
        warranties.Should().HaveCountGreaterOrEqualTo(2);

        // Inverter warranty: 2 years
        var inverterWarranty = warranties!.FirstOrDefault(w => w.Category == "Inverter");
        inverterWarranty.Should().NotBeNull();
        inverterWarranty!.SerialNumber.Should().Be("INV-GROWATT-SER-5510");
        inverterWarranty.WarrantyYears.Should().Be(2);
        inverterWarranty.IsCovered.Should().BeTrue();
        inverterWarranty.RemainingDays.Should().BeGreaterThan(700);

        // Solar panels warranty: 20 years
        var panelsWarranty = warranties.FirstOrDefault(w => w.Category == "SolarPanels");
        panelsWarranty.Should().NotBeNull();
        panelsWarranty!.WarrantyYears.Should().Be(20);
        panelsWarranty.IsCovered.Should().BeTrue();
        panelsWarranty.RemainingDays.Should().BeGreaterThan(7000);

        // Customer Support Instant Lookup by Serial Number
        var lookupRes = await admin.GetAsync("/api/warranties/lookup?query=INV-GROWATT-SER-5510", Ct);
        lookupRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var lookupDto = await lookupRes.Content.ReadFromJsonAsync<WarrantyLookupResultDto>(Ct);
        lookupDto.Should().NotBeNull();
        lookupDto!.Found.Should().BeTrue();
        lookupDto.Warranties.Should().ContainSingle(w => w.SerialNumber == "INV-GROWATT-SER-5510" && w.IsCovered);

        // Customer Portal sees warranties
        var portalRes = await customerClient.GetAsync("/api/customer-portal", Ct);
        portalRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var portalJson = await Json(portalRes);
        portalJson.TryGetProperty("warranties", out var portalWarranties).Should().BeTrue();
        portalWarranties.GetArrayLength().Should().BeGreaterOrEqualTo(2);
    }
}
