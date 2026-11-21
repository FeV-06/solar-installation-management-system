using Application.Common.Models;
using Application.DTOs.CustomerPortal;
using Application.DTOs.Quote;
using Application.DTOs.ServiceTickets;
using Domain.Entities;
using Domain.Enums;
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
            .ThenInclude(i => i.Quotes)
            .ThenInclude(q => q.Items)
            .FirstOrDefaultAsync(c => c.Id == customerId, cancellationToken);

        if (customer == null)
            return Result.Failure<CustomerPortalData>(new Error(ErrorKind.NotFound, "customer_portal.not_found", "Customer not found."));

        // New signed-in requests link by customer ID. Include older unlinked requests only by verified email.
        var leads = await db.Leads
            .Include(l => l.Address)
            .Where(l => l.CustomerId == customerId || (l.CustomerId == null && l.Email.Trim().ToUpper() == customer.NormalizedEmail))
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

        // Check if there is an active proposal for the customer's installations
        QuoteDto? proposalDto = null;
        var latestQuote = customer.Installations
            .SelectMany(i => i.Quotes)
            .OrderByDescending(q => q.CreatedAt)
            .FirstOrDefault();

        if (latestQuote != null)
        {
            proposalDto = new QuoteDto(
                latestQuote.Id,
                latestQuote.InstallationId,
                latestQuote.SystemCapacityKw,
                latestQuote.SystemType.ToString(),
                latestQuote.BasePriceRupees,
                latestQuote.EstimatedSubsidyRupees,
                latestQuote.TotalAmountRupees,
                latestQuote.AdvancePercentage,
                latestQuote.AdvanceRequiredRupees,
                latestQuote.AmountPaidRupees,
                latestQuote.Status.ToString(),
                latestQuote.PaymentStatus.ToString(),
                latestQuote.Notes,
                latestQuote.PaymentReference,
                latestQuote.CreatedAt,
                latestQuote.SentAt,
                latestQuote.AcceptedAt,
                latestQuote.PaidAt,
                latestQuote.Items.Select(i => new QuoteItemDto(
                    i.Id,
                    i.Category.ToString(),
                    i.ItemName,
                    i.Specification,
                    i.Quantity,
                    i.Unit,
                    i.UnitCostRupees,
                    i.TotalCostRupees)).ToList());
        }

        var now = DateTime.UtcNow;
        var warranties = await db.Warranties
            .Where(w => w.CustomerId == customerId)
            .OrderBy(w => w.Category)
            .ThenBy(w => w.ItemName)
            .Select(w => new WarrantyDto(
                w.Id,
                w.InstallationId,
                w.CustomerId,
                customer.FullName,
                w.ItemName,
                w.Category.ToString(),
                w.SerialNumber,
                w.WarrantyYears,
                w.StartDate,
                w.ExpiryDate,
                w.Status.ToString(),
                w.IsCovered(now),
                w.RemainingDays(now)))
            .ToListAsync(cancellationToken);

        var instIds = customer.Installations.Select(i => i.Id).ToList();
        var proof = await db.InstallationProofs
            .Where(p => instIds.Contains(p.InstallationId))
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        CustomerHandoverProof? handoverProof = proof is null ? null : new CustomerHandoverProof(
            proof.InstallationId,
            proof.SystemCapacityKw,
            proof.TestedGenerationKw,
            proof.GridConnected,
            proof.PanelArrayPhotoUrl,
            proof.InverterPhotoUrl,
            proof.MeterPhotoUrl,
            proof.CustomerSignatureData,
            proof.SignedByName,
            proof.SignedAt
        );

        var tickets = await db.ServiceTickets
            .Include(t => t.Customer)
            .Include(t => t.Installation)
                .ThenInclude(i => i.Address)
            .Include(t => t.AssignedTechnician)
            .Where(t => t.CustomerId == customerId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new ServiceTicketDto(
                t.Id,
                t.InstallationId,
                t.CustomerId,
                customer.FullName,
                customer.PhoneNumber,
                customer.Email,
                t.Installation.Address != null
                    ? $"{t.Installation.Address.Street}, {t.Installation.Address.City}, {t.Installation.Address.State} {t.Installation.Address.ZipCode}"
                    : "Site address",
                t.AssignedTechnicianId,
                t.AssignedTechnician != null ? t.AssignedTechnician.Name : null,
                t.ScheduledVisitAt,
                t.SerialNumber,
                t.HardwareItem,
                t.Category.ToString(),
                t.FaultCode,
                t.Description,
                t.PhotoUrl,
                t.DamageType.ToString(),
                t.IsWarrantyCovered,
                t.PartsCostRupees,
                t.LaborCostRupees,
                t.TotalBilledRupees,
                t.Status.ToString(),
                t.AdminNotes,
                t.ReviewedAt,
                t.CustomerApprovedAt,
                t.ReplacementPackingOrderId,
                t.ReplacementSerialNumber,
                t.TestedGenerationKw,
                t.ReplacementPhotoUrl,
                t.TechnicianResolutionNotes,
                t.ResolvedAt,
                t.CustomerSignatureData,
                t.SignedByName,
                t.TechnicianSignedAt,
                t.CustomerConfirmedAt,
                t.CreatedAt))
            .ToListAsync(cancellationToken);

        return Result.Success(new CustomerPortalData(activeQuote, quoteSummaries, installationSummaries, proposalDto, warranties, handoverProof, tickets));
    }
}
