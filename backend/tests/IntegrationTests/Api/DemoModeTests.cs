using System.Net;
using System.Net.Http.Json;
using Application.Interfaces.Services;
using Domain.Entities;
using Domain.Enums;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TestUtilities.Database;

namespace IntegrationTests.Api;

public class DemoModeTests(PostgresFixture database) : ApiTestBase(database)
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task DemoMode_EnableAndDisable_WorksRealTimeAndPreservesManualEntries()
    {
        // 1. Seed a manual customer & installation (IsDemo = false)
        var manualAddress = new Address
        {
            Street = "Manual 99 Civil Lines",
            City = "Amritsar",
            State = "Punjab",
            ZipCode = "143001",
            Country = "India",
            UniqueAddressHash = Address.BuildHash("Manual 99 Civil Lines", "Amritsar", "Punjab", "143001", "India"),
            IsDemo = false
        };
        Context.Addresses.Add(manualAddress);
        await Context.SaveChangesAsync(Ct);

        var manualCustomer = new Customer
        {
            FirstName = "Gourish",
            LastName = "Julka",
            Email = "gourish.manual@example.com",
            NormalizedEmail = "GOURISH.MANUAL@EXAMPLE.COM",
            PhoneNumber = "+919812345678",
            ContactAddressId = manualAddress.Id,
            RegistrationDate = DateTime.UtcNow,
            IsDemo = false
        };
        Context.Customers.Add(manualCustomer);
        await Context.SaveChangesAsync(Ct);

        var manualLead = new Lead
        {
            FirstName = "Gourish",
            LastName = "Julka",
            Email = manualCustomer.Email,
            PhoneNumber = manualCustomer.PhoneNumber,
            AddressId = manualAddress.Id,
            MonthlyBillRange = "5000-10000",
            BestTimeToContact = "Anytime",
            Status = LeadStatus.Converted,
            CreatedAt = DateTime.UtcNow,
            IsDemo = false,
            CustomerId = manualCustomer.Id
        };
        Context.Leads.Add(manualLead);
        await Context.SaveChangesAsync(Ct);

        var manualInstallation = new Installation
        {
            CustomerId = manualCustomer.Id,
            AddressId = manualAddress.Id,
            LeadId = manualLead.Id,
            Status = InstallationStatus.Active,
            TimeZone = "Asia/Kolkata",
            CreatedAt = DateTime.UtcNow,
            IsDemo = false
        };
        Context.Installations.Add(manualInstallation);
        await Context.SaveChangesAsync(Ct);

        var admin = await CreateClientAsAsync(UserRole.Admin);

        // 2. Check initial status
        var initialRes = await admin.GetAsync("/api/demo/status", Ct);
        initialRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var initialStatus = await initialRes.Content.ReadFromJsonAsync<DemoStatusDto>(Ct);
        initialStatus!.IsEnabled.Should().BeFalse();

        // 3. Enable Demo Mode
        var enableRes = await admin.PostAsync("/api/demo/enable", null, Ct);
        enableRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var enabledStatus = await enableRes.Content.ReadFromJsonAsync<DemoStatusDto>(Ct);
        enabledStatus!.IsEnabled.Should().BeTrue();
        enabledStatus.TotalDemoProjects.Should().Be(400);

        // Verify manual installation still exists and demo installations were created
        var totalInstalls = await Context.Installations.CountAsync(Ct);
        totalInstalls.Should().Be(351); // 1 manual + 350 demo

        var manualExists = await Context.Installations.AnyAsync(i => i.Id == manualInstallation.Id && !i.IsDemo, Ct);
        manualExists.Should().BeTrue();

        // 4. Disable Demo Mode (Teardown)
        var disableRes = await admin.PostAsync("/api/demo/disable", null, Ct);
        disableRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var disabledStatus = await disableRes.Content.ReadFromJsonAsync<DemoStatusDto>(Ct);
        disabledStatus!.IsEnabled.Should().BeFalse();
        disabledStatus.TotalDemoProjects.Should().Be(0);

        // 5. Verify ALL demo records were wiped while manual records were completely preserved
        var remainingInstalls = await Context.Installations.ToListAsync(Ct);
        remainingInstalls.Should().HaveCount(1);
        remainingInstalls.Single().Id.Should().Be(manualInstallation.Id);
        remainingInstalls.Single().IsDemo.Should().BeFalse();

        var remainingCustomers = await Context.Customers.ToListAsync(Ct);
        remainingCustomers.Should().HaveCount(1);
        remainingCustomers.Single().Id.Should().Be(manualCustomer.Id);

        var remainingLeads = await Context.Leads.ToListAsync(Ct);
        remainingLeads.Should().HaveCount(1);
        remainingLeads.Single().Id.Should().Be(manualLead.Id);
    }
}
