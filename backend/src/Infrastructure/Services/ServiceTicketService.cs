using Application.Common.Models;
using Application.DTOs.ServiceTickets;
using Application.Errors;
using Application.Interfaces.Services;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services;

public class ServiceTicketService(AppDbContext db) : IServiceTicketService
{
    public async Task<Result<IReadOnlyList<ServiceTicketDto>>> GetAllAsync(string? status = null, CancellationToken ct = default)
    {
        var query = db.ServiceTickets
            .Include(t => t.Customer)
            .Include(t => t.Installation)
                .ThenInclude(i => i.Address)
            .Include(t => t.AssignedTechnician)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<ServiceTicketStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(t => t.Status == parsedStatus);
        }

        var tickets = await query
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => MapToDto(t))
            .ToListAsync(ct);

        return Result.Success<IReadOnlyList<ServiceTicketDto>>(tickets);
    }

    public async Task<Result<IReadOnlyList<ServiceTicketDto>>> GetByCustomerAsync(int customerId, CancellationToken ct = default)
    {
        var tickets = await db.ServiceTickets
            .Include(t => t.Customer)
            .Include(t => t.Installation)
                .ThenInclude(i => i.Address)
            .Include(t => t.AssignedTechnician)
            .Where(t => t.CustomerId == customerId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => MapToDto(t))
            .ToListAsync(ct);

        return Result.Success<IReadOnlyList<ServiceTicketDto>>(tickets);
    }

    public async Task<Result<ServiceTicketDto>> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var ticket = await db.ServiceTickets
            .Include(t => t.Customer)
            .Include(t => t.Installation)
                .ThenInclude(i => i.Address)
            .Include(t => t.AssignedTechnician)
            .FirstOrDefaultAsync(t => t.Id == id, ct);

        if (ticket == null)
            return Result.Failure<ServiceTicketDto>(ServiceTicketErrors.NotFound(id));

        return Result.Success(MapToDto(ticket));
    }

    public async Task<Result<ServiceTicketDto>> CreateTicketAsync(CreateServiceTicketRequest request, int customerId, CancellationToken ct = default)
    {
        var installation = await db.Installations
            .Include(i => i.Customer)
            .Include(i => i.Address)
            .FirstOrDefaultAsync(i => i.Id == request.InstallationId && i.CustomerId == customerId, ct);

        if (installation == null)
            return Result.Failure<ServiceTicketDto>(QuoteErrors.InstallationNotFound(request.InstallationId));

        var now = DateTime.UtcNow;
        var serialTrimmed = request.SerialNumber.Trim();

        // 1. Look up warranty status for this serial number
        var warranty = await db.Warranties
            .FirstOrDefaultAsync(w => w.InstallationId == request.InstallationId &&
                                      w.SerialNumber.ToLower() == serialTrimmed.ToLower(), ct);

        string itemName = "Solar Equipment";
        var category = BOMCategory.Inverter;
        bool isCovered = false;

        if (warranty != null)
        {
            itemName = warranty.ItemName;
            category = warranty.Category;
            isCovered = warranty.IsCovered(now);
        }
        else
        {
            // Fallback: check packing items if warranty record not yet present
            var packingItem = await db.PackingOrderItems
                .Where(p => p.PackingOrder.InstallationId == request.InstallationId && p.SerialNumber == serialTrimmed)
                .FirstOrDefaultAsync(ct);

            if (packingItem != null)
            {
                itemName = packingItem.ItemName;
                category = packingItem.Category;
                isCovered = true; // recent installation within default warranty period
            }
        }

        // Standard auto-billing defaults (Scene 5)
        decimal partsCost = 0m;
        decimal laborCost = 0m;

        if (!isCovered)
        {
            partsCost = category == BOMCategory.Inverter ? 32000m : category == BOMCategory.Battery ? 45000m : 8000m;
            laborCost = 1500m; // standard service visit charge
        }

        var ticket = new ServiceTicket
        {
            InstallationId = request.InstallationId,
            CustomerId = customerId,
            SerialNumber = serialTrimmed,
            HardwareItem = itemName,
            Category = category,
            FaultCode = request.FaultCode.Trim(),
            Description = request.Description.Trim(),
            PhotoUrl = request.PhotoUrl,
            DamageType = DamageType.EquipmentFailure,
            IsWarrantyCovered = isCovered,
            PartsCostRupees = partsCost,
            LaborCostRupees = laborCost,
            TotalBilledRupees = partsCost + laborCost,
            Status = ServiceTicketStatus.Open,
            CreatedAt = now
        };

        db.ServiceTickets.Add(ticket);
        await db.SaveChangesAsync(ct);

        return await GetByIdAsync(ticket.Id, ct);
    }

    public async Task<Result<ServiceTicketDto>> ReviewTicketAsync(int id, ReviewServiceTicketRequest request, CancellationToken ct = default)
    {
        var ticket = await db.ServiceTickets
            .Include(t => t.Customer)
            .Include(t => t.Installation)
            .FirstOrDefaultAsync(t => t.Id == id, ct);

        if (ticket == null)
            return Result.Failure<ServiceTicketDto>(ServiceTicketErrors.NotFound(id));

        if (!Enum.TryParse<DamageType>(request.DamageType, true, out var damageType))
        {
            damageType = DamageType.EquipmentFailure;
        }

        ticket.DamageType = damageType;

        // If accidental customer damage, it is never covered under free warranty
        if (damageType == DamageType.AccidentalDamage)
        {
            ticket.IsWarrantyCovered = false;
        }
        else
        {
            ticket.IsWarrantyCovered = request.IsWarrantyCovered;
        }

        ticket.PartsCostRupees = request.PartsCostRupees;
        ticket.LaborCostRupees = request.LaborCostRupees;
        ticket.TotalBilledRupees = request.PartsCostRupees + request.LaborCostRupees;
        ticket.AdminNotes = request.AdminNotes;
        ticket.ReviewedAt = DateTime.UtcNow;

        if (request.AssignTechnicianId.HasValue)
        {
            ticket.AssignedTechnicianId = request.AssignTechnicianId.Value;
        }

        ticket.Status = ServiceTicketStatus.Reviewed;

        await db.SaveChangesAsync(ct);
        return await GetByIdAsync(ticket.Id, ct);
    }

    public async Task<Result<ServiceTicketDto>> CustomerApproveTicketAsync(int id, int customerId, ApproveServiceTicketRequest request, CancellationToken ct = default)
    {
        var ticket = await db.ServiceTickets
            .Include(t => t.Installation)
            .FirstOrDefaultAsync(t => t.Id == id, ct);

        if (ticket == null)
            return Result.Failure<ServiceTicketDto>(ServiceTicketErrors.NotFound(id));

        if (ticket.CustomerId != customerId)
            return Result.Failure<ServiceTicketDto>(ServiceTicketErrors.Unauthorized);

        if (ticket.Status != ServiceTicketStatus.Reviewed && ticket.Status != ServiceTicketStatus.Open)
            return Result.Failure<ServiceTicketDto>(ServiceTicketErrors.InvalidStatus);

        var now = DateTime.UtcNow;
        ticket.CustomerApprovedAt = now;
        ticket.Status = ServiceTicketStatus.Approved;

        // Downstream Action: Auto-generate Replacement Quote and Packing Order (Workflow re-entry skipping survey)
        var originalQuote = await db.Quotes
            .Where(q => q.InstallationId == ticket.InstallationId)
            .OrderByDescending(q => q.CreatedAt)
            .FirstOrDefaultAsync(ct);

        var capacity = originalQuote?.SystemCapacityKw ?? 3.0m;
        var systemType = originalQuote?.SystemType ?? SolarSystemType.OnGrid;

        var repairQuote = new Quote
        {
            InstallationId = ticket.InstallationId,
            SystemCapacityKw = capacity,
            SystemType = systemType,
            BasePriceRupees = ticket.PartsCostRupees,
            EstimatedSubsidyRupees = 0m,
            TotalAmountRupees = ticket.TotalBilledRupees,
            AdvancePercentage = 100m,
            AdvanceRequiredRupees = ticket.TotalBilledRupees,
            AmountPaidRupees = ticket.TotalBilledRupees,
            Status = QuoteStatus.Accepted,
            PaymentStatus = ticket.IsWarrantyCovered ? PaymentStatus.FullyPaid : (ticket.TotalBilledRupees == 0 ? PaymentStatus.FullyPaid : PaymentStatus.Pending),
            PaymentReference = ticket.IsWarrantyCovered ? $"WARRANTY-COVERED-TICKET-{ticket.Id}" : $"REPAIR-PAY-{ticket.Id}",
            Notes = $"Post-Sales Warranty Service for Ticket #{ticket.Id} ({ticket.FaultCode})",
            CreatedAt = now,
            AcceptedAt = now,
            PaidAt = ticket.IsWarrantyCovered ? now : null,
            Items =
            [
                new QuoteItem
                {
                    Category = ticket.Category,
                    ItemName = $"Replacement: {ticket.HardwareItem}",
                    Specification = $"Hardware Replacement for Fault {ticket.FaultCode}",
                    Quantity = 1,
                    Unit = "nos",
                    UnitCostRupees = ticket.PartsCostRupees,
                    TotalCostRupees = ticket.PartsCostRupees
                }
            ]
        };

        db.Quotes.Add(repairQuote);
        await db.SaveChangesAsync(ct);

        var replacementPackingOrder = new PackingOrder
        {
            InstallationId = ticket.InstallationId,
            QuoteId = repairQuote.Id,
            Status = PackingStatus.Pending,
            CreatedAt = now,
            Items =
            [
                new PackingOrderItem
                {
                    ItemName = $"Replacement: {ticket.HardwareItem}",
                    Category = ticket.Category,
                    Quantity = 1,
                    Unit = "nos",
                    IsPacked = false,
                    RequiresSerialNumber = true
                }
            ]
        };

        db.PackingOrders.Add(replacementPackingOrder);
        await db.SaveChangesAsync(ct);
        ticket.ReplacementPackingOrderId = replacementPackingOrder.Id;

        await db.SaveChangesAsync(ct);
        return await GetByIdAsync(ticket.Id, ct);
    }

    public async Task<Result<ServiceTicketDto>> TechnicianResolveTicketAsync(int id, int technicianUserId, ResolveServiceTicketRequest request, CancellationToken ct = default)
    {
        var ticket = await db.ServiceTickets
            .Include(t => t.Installation)
            .FirstOrDefaultAsync(t => t.Id == id, ct);

        if (ticket == null)
            return Result.Failure<ServiceTicketDto>(ServiceTicketErrors.NotFound(id));

        var now = DateTime.UtcNow;
        var newSerial = request.ReplacementSerialNumber.Trim();

        ticket.ReplacementSerialNumber = newSerial;
        ticket.TechnicianResolutionNotes = request.ResolutionNotes.Trim();
        ticket.CustomerSignatureData = request.CustomerSignatureData;
        ticket.TechnicianSignedAt = now;
        ticket.ResolvedAt = now;
        ticket.AssignedTechnicianId = technicianUserId;

        // Invariant: Status remains Pending Confirmation until Homeowner confirms power restoration
        ticket.Status = ServiceTicketStatus.ResolvedPendingCustomerConfirmation;

        // Auto-register warranty for the new replacement hardware unit
        var warrantyYears = ticket.Category == BOMCategory.SolarPanels ? 20 : 2;
        db.Warranties.Add(new Warranty
        {
            InstallationId = ticket.InstallationId,
            CustomerId = ticket.CustomerId,
            ItemName = ticket.HardwareItem,
            Category = ticket.Category,
            SerialNumber = newSerial,
            WarrantyYears = warrantyYears,
            StartDate = now,
            ExpiryDate = now.AddYears(warrantyYears),
            Status = WarrantyStatus.Active,
            CreatedAt = now
        });

        await db.SaveChangesAsync(ct);
        return await GetByIdAsync(ticket.Id, ct);
    }

    public async Task<Result<ServiceTicketDto>> CustomerConfirmRestorationAsync(int id, int customerId, ConfirmServiceTicketRequest request, CancellationToken ct = default)
    {
        var ticket = await db.ServiceTickets.FirstOrDefaultAsync(t => t.Id == id, ct);

        if (ticket == null)
            return Result.Failure<ServiceTicketDto>(ServiceTicketErrors.NotFound(id));

        if (ticket.CustomerId != customerId)
            return Result.Failure<ServiceTicketDto>(ServiceTicketErrors.Unauthorized);

        if (ticket.Status != ServiceTicketStatus.ResolvedPendingCustomerConfirmation)
            return Result.Failure<ServiceTicketDto>(ServiceTicketErrors.InvalidStatus);

        ticket.CustomerConfirmedAt = DateTime.UtcNow;
        ticket.Status = ServiceTicketStatus.Closed;

        await db.SaveChangesAsync(ct);
        return await GetByIdAsync(ticket.Id, ct);
    }

    private static ServiceTicketDto MapToDto(ServiceTicket t) => new(
        t.Id,
        t.InstallationId,
        t.CustomerId,
        t.Customer?.FullName ?? "Customer",
        t.Customer?.PhoneNumber ?? "",
        t.Customer?.Email ?? "",
        t.Installation?.Address != null
            ? $"{t.Installation.Address.Street}, {t.Installation.Address.City}, {t.Installation.Address.State} {t.Installation.Address.ZipCode}"
            : "Site address",
        t.AssignedTechnicianId,
        t.AssignedTechnician?.Name,
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
        t.TechnicianResolutionNotes,
        t.ResolvedAt,
        t.CustomerSignatureData,
        t.TechnicianSignedAt,
        t.CustomerConfirmedAt,
        t.CreatedAt);
}
