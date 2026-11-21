using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Application.Common.Models;
using Application.Interfaces.Services;
using Domain.Enums;
using FluentAssertions;
using Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TestUtilities.Database;

namespace IntegrationTests.Api;

public class CustomerJourneyTests(PostgresFixture database) : ApiTestBase(database)
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;
    private static async Task<JsonElement> Json(HttpResponseMessage response) => await response.Content.ReadFromJsonAsync<JsonElement>(Ct);

    [Fact]
    public async Task VerifiedCustomer_Request_BecomesAssignedSurvey_WithoutCrossRoleAccess()
    {
        var sent = new ConcurrentQueue<EmailMessage>();
        var customer = CreateClient(services => services.AddScoped<IEmailSender>(_ => new CaptureSender(sent)));
        var requestOtp = await customer.PostAsJsonAsync("/api/customer-auth/request-otp", new { email = "owner@example.test" }, Ct);
        requestOtp.StatusCode.Should().Be(HttpStatusCode.OK);
        var message = sent.Should().ContainSingle().Subject;
        message.Subject.Should().NotMatchRegex("[0-9]{6}");
        var code = Regex.Match(message.TextBody, @"Your code: ([0-9]{6})").Groups[1].Value;
        code.Should().HaveLength(6);
        var verify = await customer.PostAsJsonAsync("/api/customer-auth/verify-otp", new { email = "owner@example.test", code }, Ct);
        verify.StatusCode.Should().Be(HttpStatusCode.OK);
        var session = verify.Headers.GetValues("Set-Cookie").Single().Split(';')[0];
        customer.DefaultRequestHeaders.Add("Cookie", session);
        var me = await Json(await customer.GetAsync("/api/customer-auth/me", Ct));
        var customerId = me.GetProperty("id").GetInt32();
        var replay = await CreateClient().PostAsJsonAsync("/api/customer-auth/verify-otp", new { email = "owner@example.test", code }, Ct);
        replay.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var quote = ErrorResponseTests.ValidLead(email: "different@example.test");
        quote.PropertyStreet = "12 MG Road";
        quote.PropertyCity = "New Delhi";
        quote.PropertyState = "DL";
        quote.PropertyZipCode = "110001";
        quote.PropertyCountry = "IN";
        quote.PropertyLatitude = null;
        quote.PropertyLongitude = null;
        quote.MonthlyBillRange = "in-1500-3000";
        var created = await customer.PostAsJsonAsync("/api/customer-portal/quote-requests", quote, Ct);
        created.StatusCode.Should().Be(HttpStatusCode.Created);
        var leadId = (await Json(created)).GetProperty("id").GetInt32();
        var lead = await Context.Leads.AsNoTracking().SingleAsync(l => l.Id == leadId, Ct);
        lead.Email.Should().Be("owner@example.test");
        lead.CustomerId.Should().Be(customerId);
        (await customer.GetAsync("/api/leads", Ct)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var portal = await Json(await customer.GetAsync("/api/customer-portal", Ct));
        portal.GetProperty("quotes").EnumerateArray().Should().ContainSingle();

        var admin = await CreateClientAsAsync(UserRole.Admin);
        var technician = await CreateClientAsAsync(UserRole.Technician);
        var technicianId = await IdOfAsync(TestTechnician.Email);
        (await admin.GetAsync("/api/customer-portal", Ct)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await admin.PutAsJsonAsync($"/api/leads/{leadId}", new
        {
            firstName = "Jane", lastName = "Doe", email = "other@example.test", phone = "+1 512 555 0100"
        }, Ct)).StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await admin.PutAsJsonAsync($"/api/leads/{leadId}/status", new { status = "Contacted" }, Ct)).StatusCode.Should().Be(HttpStatusCode.OK);
        var converted = await admin.PostAsync($"/api/leads/{leadId}/convert", null, Ct);
        converted.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await Json(converted);
        result.GetProperty("customer").GetProperty("id").GetInt32().Should().Be(customerId);
        var installationId = result.GetProperty("installationId").GetInt32();
        var scheduled = await admin.PostAsJsonAsync($"/api/installations/{installationId}/surveys",
            new { technicianId, scheduledAt = "2026-11-24T10:00:00Z" }, Ct);
        scheduled.StatusCode.Should().Be(HttpStatusCode.Created);
        var surveyId = (await Json(scheduled)).GetProperty("id").GetInt32();
        var report = new { shadowFreeRoofAreaSquareMetres = 40, monthlyBillRupees = 1200, gridSuitable = true,
            roofDirectionDegrees = 180, roofTiltDegrees = 25, cableDistanceMetres = 10 };
        (await admin.PutAsJsonAsync($"/api/surveys/{surveyId}/report", report, Ct)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await technician.PutAsJsonAsync($"/api/surveys/{surveyId}/report", report, Ct)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await admin.PostAsJsonAsync($"/api/surveys/{surveyId}/review", new { approved = true }, Ct)).StatusCode.Should().Be(HttpStatusCode.OK);
        var installed = await Context.Installations.AsNoTracking().SingleAsync(i => i.Id == installationId, Ct);
        installed.Status.Should().Be(InstallationStatus.Design);
        installed.TimeZone.Should().Be("Asia/Kolkata");

        // Scene 2: Getting the kit right - Auto-generated draft quote on survey approval
        var quoteResponse = await admin.GetAsync($"/api/installations/{installationId}/quote", Ct);
        quoteResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var quoteJson = await Json(quoteResponse);
        var quoteId = quoteJson.GetProperty("id").GetInt32();
        quoteJson.GetProperty("systemCapacityKw").GetDecimal().Should().BeGreaterThan(0);
        quoteJson.GetProperty("items").EnumerateArray().Should().NotBeEmpty();

        // Admin sends quote to customer
        var sendResponse = await admin.PutAsync($"/api/quotes/{quoteId}/send", null, Ct);
        sendResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Customer sees proposal in customer portal
        var portalWithQuote = await Json(await customer.GetAsync("/api/customer-portal", Ct));
        portalWithQuote.GetProperty("proposal").GetProperty("id").GetInt32().Should().Be(quoteId);

        // Customer accepts and pays advance
        var payResponse = await customer.PostAsJsonAsync($"/api/customer-portal/quotes/{quoteId}/pay", new { paymentType = "Advance" }, Ct);
        payResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var paidQuote = await Json(payResponse);
        paidQuote.GetProperty("status").GetString().Should().Be("Accepted");
        paidQuote.GetProperty("paymentStatus").GetString().Should().Be("AdvancePaid");
        paidQuote.GetProperty("amountPaidRupees").GetDecimal().Should().BeGreaterThan(0);
        paidQuote.GetProperty("paymentReference").GetString().Should().StartWith("PAY-");

        // Installation moves to Installation stage (crew schedule ready)
        installed = await Context.Installations.AsNoTracking().SingleAsync(i => i.Id == installationId, Ct);
        installed.Status.Should().Be(InstallationStatus.Installation);

        // Warehouse packing order generated with serial-tracked items
        var packingResponse = await admin.GetAsync($"/api/installations/{installationId}/packing-order", Ct);
        packingResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var packing = await Json(packingResponse);
        packing.GetProperty("status").GetString().Should().Be("Pending");
        packing.GetProperty("items").EnumerateArray().Should().Contain(item => item.GetProperty("requiresSerialNumber").GetBoolean());
    }

    [Fact]
    public async Task ConcurrentOtpVerification_OnlyOneSessionIsIssued()
    {
        var sent = new ConcurrentQueue<EmailMessage>();
        var client = CreateClient(services => services.AddScoped<IEmailSender>(_ => new CaptureSender(sent)));
        (await client.PostAsJsonAsync("/api/customer-auth/request-otp", new { email = "parallel@example.test" }, Ct)).StatusCode.Should().Be(HttpStatusCode.OK);
        var code = Regex.Match(sent.Single().TextBody, @"Your code: ([0-9]{6})").Groups[1].Value;
        var attempts = Enumerable.Range(0, 5).Select(_ => client.PostAsJsonAsync("/api/customer-auth/verify-otp",
            new { email = "parallel@example.test", code }, Ct));
        var responses = await Task.WhenAll(attempts);
        responses.Count(response => response.StatusCode == HttpStatusCode.OK).Should().Be(1);
        (await Context.Customers.AsNoTracking().CountAsync(Ct)).Should().Be(1);
        (await Context.CustomerOtps.AsNoTracking().CountAsync(o => o.ConsumedAtUtc != null, Ct)).Should().Be(1);
    }

    [Fact]
    public async Task ConcurrentOtpRequests_OnlyOneCodeIsIssued()
    {
        var sent = new ConcurrentQueue<EmailMessage>();
        var client = CreateClient(services => services.AddScoped<IEmailSender>(_ => new CaptureSender(sent)));
        var attempts = Enumerable.Range(0, 5).Select(_ => client.PostAsJsonAsync("/api/customer-auth/request-otp",
            new { email = "parallel@example.test" }, Ct));
        var responses = await Task.WhenAll(attempts);
        responses.Count(response => response.StatusCode == HttpStatusCode.OK).Should().Be(1);
        sent.Should().ContainSingle();
        (await Context.CustomerOtps.AsNoTracking().CountAsync(o => o.ConsumedAtUtc == null, Ct)).Should().Be(1);
    }

    [Fact]
    public async Task OtpFailuresLockOut_AndCrossSiteCustomerRequestsAreRefused()
    {
        var sent = new ConcurrentQueue<EmailMessage>();
        var client = CreateClient(services => services.AddScoped<IEmailSender>(_ => new CaptureSender(sent)));
        (await client.PostAsJsonAsync("/api/customer-auth/request-otp", new { email = "owner@example.test" }, Ct)).StatusCode.Should().Be(HttpStatusCode.OK);
        var code = Regex.Match(sent.Single().TextBody, @"Your code: ([0-9]{6})").Groups[1].Value;
        var wrong = code == "111111" ? "222222" : "111111";
        for (var i = 0; i < 5; i++)
            (await client.PostAsJsonAsync("/api/customer-auth/verify-otp", new { email = "owner@example.test", code = wrong }, Ct)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await client.PostAsJsonAsync("/api/customer-auth/verify-otp", new { email = "owner@example.test", code }, Ct)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await Context.Customers.CountAsync(Ct)).Should().Be(0);

        var crossSite = new HttpRequestMessage(HttpMethod.Post, "/api/customer-auth/request-otp")
        {
            Content = JsonContent.Create(new { email = "other@example.test" })
        };
        crossSite.Headers.Add("Origin", "https://unrelated.example");
        (await client.SendAsync(crossSite, Ct)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task FailedDelivery_DoesNotClaimCodeWasSent()
    {
        var client = CreateClient(services => services.AddScoped<IEmailSender>(_ => new CaptureSender(new(), fail: true)));
        var response = await client.PostAsJsonAsync("/api/customer-auth/request-otp", new { email = "owner@example.test" }, Ct);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var otp = await Context.CustomerOtps.AsNoTracking().SingleAsync(Ct);
        otp.ConsumedAtUtc.Should().NotBeNull();
    }

    [Fact]
    public async Task SimultaneousStaffAndCustomerCookies_ChooseCorrectIdentityPerRoute()
    {
        var sent = new ConcurrentQueue<EmailMessage>();
        var customer = CreateClient(services => services.AddScoped<IEmailSender>(_ => new CaptureSender(sent)));
        (await customer.PostAsJsonAsync("/api/customer-auth/request-otp", new { email = "owner@example.test" }, Ct)).StatusCode.Should().Be(HttpStatusCode.OK);
        var code = Regex.Match(sent.Single().TextBody, @"Your code: ([0-9]{6})").Groups[1].Value;
        var verified = await customer.PostAsJsonAsync("/api/customer-auth/verify-otp", new { email = "owner@example.test", code }, Ct);
        var customerCookie = verified.Headers.GetValues("Set-Cookie").Single().Split(';')[0];
        var admin = await CreateClientAsAsync(UserRole.Admin);
        var staffToken = admin.DefaultRequestHeaders.Authorization!.Parameter;
        var both = CreateClient();
        both.DefaultRequestHeaders.Add("Cookie", $"{customerCookie}; {Session.CookieName}={staffToken}");
        (await both.GetAsync("/api/customer-portal", Ct)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await both.GetAsync("/api/users", Ct)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await both.GetAsync("/api/auth/me", Ct)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await both.GetAsync("/api/customer-auth/me", Ct)).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private sealed class CaptureSender(ConcurrentQueue<EmailMessage> sent, bool fail = false) : IEmailSender
    {
        public Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
        {
            if (fail) throw new InvalidOperationException("simulated failure");
            sent.Enqueue(message);
            return Task.CompletedTask;
        }
    }
}
