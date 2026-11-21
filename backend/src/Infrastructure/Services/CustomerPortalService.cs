using Application.Common.Models;
using Application.DTOs.CustomerPortal;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services;

public interface ICustomerPortalService
{
    Task<Result<CustomerPortalData>> GetPortalDataAsync(int customerId, CancellationToken cancellationToken = default);
}

public class CustomerPortalService(AppDbContext db) : ICustomerPortalService
{
    public async Task<Result<CustomerPortalData>> GetPortalDataAsync(int customerId, CancellationToken cancellationToken = default)
    {
        var customer = await db.Customers
            .Include(c => c.Installations)
            .FirstOrDefaultAsync(c => c.Id == customerId, cancellationToken);

        if (customer == null)
            return Result.Failure<CustomerPortalData>(new Error(ErrorKind.NotFound, "customer_portal.not_found", "Customer not found."));

        // Retrieve leads matching customer's normalized email or linked customerId
        var leads = await db.Leads
            .Include(l => l.Address)
            .Where(l => l.CustomerId == customerId || l.Email.ToLower() == customer.Email.ToLower())
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync(cancellationToken);

        var quoteSummaries = leads.Select(l => new CustomerQuoteSummary(
            l.Id,
            l.Status.ToString(),
            l.Address != null ? $"{l.Address.Street}, {l.Address.City}, {l.Address.State} {l.Address.ZipCode}" : "Address pending",
            l.PropertyType.ToString(),
            l.MonthlyBillRange,
            l.CreatedAt,
            l.ContactedAt,
            l.ClosedAt,
            l.Notes)).ToList();

        var activeQuote = quoteSummaries.FirstOrDefault(q => q.Status is "New" or "Contacted");

        var installationSummaries = customer.Installations.Select(i => new CustomerInstallationSummary(
            i.Id,
            i.Status.ToString(),
            i.TimeZone,
            i.CreatedAt)).ToList();

        return Result.Success(new CustomerPortalData(activeQuote, quoteSummaries, installationSummaries));
    }
}
