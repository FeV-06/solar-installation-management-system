using Application.Common.Models;
using Application.DTOs.Quote;
using Application.Errors;
using Application.Interfaces.Services;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services;

public class QuoteService(AppDbContext db, IQuoteTemplateEngine templateEngine) : IQuoteService
{
    public async Task<Result<QuoteDto>> GetByInstallationIdAsync(int installationId, CancellationToken ct = default)
    {
        var quote = await db.Quotes
            .Include(q => q.Items)
            .Where(q => q.InstallationId == installationId)
            .OrderByDescending(q => q.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (quote == null)
            return Result.Failure<QuoteDto>(QuoteErrors.NotFound(installationId));

        return Result.Success(MapToDto(quote));
    }

    public async Task<Result<QuoteDto>> GetByIdAsync(int quoteId, CancellationToken ct = default)
    {
        var quote = await db.Quotes
            .Include(q => q.Items)
            .FirstOrDefaultAsync(q => q.Id == quoteId, ct);

        if (quote == null)
            return Result.Failure<QuoteDto>(QuoteErrors.NotFound(quoteId));

        return Result.Success(MapToDto(quote));
    }

    public async Task<Result<QuoteDto>> GenerateOrUpdateAsync(int installationId, GenerateQuoteRequest request, CancellationToken ct = default)
    {
        var installation = await db.Installations
            .Include(i => i.Quotes)
            .ThenInclude(q => q.Items)
            .FirstOrDefaultAsync(i => i.Id == installationId, ct);

        if (installation == null)
            return Result.Failure<QuoteDto>(QuoteErrors.InstallationNotFound(installationId));

        var survey = await db.Surveys
            .Where(s => s.InstallationId == installationId && s.Status == SurveyStatus.Approved)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (survey == null)
            return Result.Failure<QuoteDto>(QuoteErrors.SurveyNotApproved);

        SolarSystemType? systemType = null;
        if (!string.IsNullOrWhiteSpace(request.SystemType) && Enum.TryParse<SolarSystemType>(request.SystemType, true, out var parsedType))
        {
            systemType = parsedType;
        }

        var newQuote = templateEngine.Generate(installation, survey, request.SystemCapacityKw, systemType);
        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            newQuote.Notes = request.Notes.Trim();
        }

        var existing = installation.Quotes.FirstOrDefault(q => q.Status is QuoteStatus.Draft or QuoteStatus.Sent);
        if (existing != null)
        {
            existing.SystemCapacityKw = newQuote.SystemCapacityKw;
            existing.SystemType = newQuote.SystemType;
            existing.BasePriceRupees = newQuote.BasePriceRupees;
            existing.EstimatedSubsidyRupees = newQuote.EstimatedSubsidyRupees;
            existing.TotalAmountRupees = newQuote.TotalAmountRupees;
            existing.AdvancePercentage = newQuote.AdvancePercentage;
            existing.AdvanceRequiredRupees = newQuote.AdvanceRequiredRupees;
            existing.Notes = newQuote.Notes;

            db.QuoteItems.RemoveRange(existing.Items);
            existing.Items = newQuote.Items;
            await db.SaveChangesAsync(ct);
            return Result.Success(MapToDto(existing));
        }

        db.Quotes.Add(newQuote);
        await db.SaveChangesAsync(ct);
        return Result.Success(MapToDto(newQuote));
    }

    public async Task<Result<QuoteDto>> SendQuoteAsync(int quoteId, CancellationToken ct = default)
    {
        var quote = await db.Quotes
            .Include(q => q.Items)
            .FirstOrDefaultAsync(q => q.Id == quoteId, ct);

        if (quote == null)
            return Result.Failure<QuoteDto>(QuoteErrors.NotFound(quoteId));

        quote.Status = QuoteStatus.Sent;
        quote.SentAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return Result.Success(MapToDto(quote));
    }

    public async Task<Result<QuoteDto>> AcceptAndPayAsync(int quoteId, CustomerPayQuoteRequest request, int? customerId, CancellationToken ct = default)
    {
        var quote = await db.Quotes
            .Include(q => q.Installation)
            .Include(q => q.Items)
            .Include(q => q.PackingOrder)
            .FirstOrDefaultAsync(q => q.Id == quoteId, ct);

        if (quote == null)
            return Result.Failure<QuoteDto>(QuoteErrors.NotFound(quoteId));

        if (customerId.HasValue && quote.Installation.CustomerId != customerId.Value)
            return Result.Failure<QuoteDto>(QuoteErrors.Unauthorized);

        if (quote.PaymentStatus is PaymentStatus.AdvancePaid or PaymentStatus.FullyPaid)
            return Result.Failure<QuoteDto>(QuoteErrors.AlreadyPaid);

        var isFull = string.Equals(request.PaymentType, "Full", StringComparison.OrdinalIgnoreCase);
        var isAdvance = string.Equals(request.PaymentType, "Advance", StringComparison.OrdinalIgnoreCase);

        if (!isFull && !isAdvance)
            return Result.Failure<QuoteDto>(QuoteErrors.InvalidPaymentType);

        var paymentAmount = isFull ? quote.TotalAmountRupees : quote.AdvanceRequiredRupees;
        var now = DateTime.UtcNow;

        quote.Status = QuoteStatus.Accepted;
        quote.AcceptedAt = now;
        quote.PaidAt = now;
        quote.AmountPaidRupees = paymentAmount;
        quote.PaymentStatus = isFull ? PaymentStatus.FullyPaid : PaymentStatus.AdvancePaid;
        quote.PaymentReference = $"PAY-{now:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
        quote.ReceiptPhotoUrl = request.ReceiptPhotoUrl;

        // Transition installation status to Installation (crew queue now active)
        quote.Installation.Status = InstallationStatus.Installation;

        // Auto-generate Warehouse Packing Order
        if (quote.PackingOrder == null)
        {
            var packingOrder = new PackingOrder
            {
                InstallationId = quote.InstallationId,
                QuoteId = quote.Id,
                Status = PackingStatus.Pending,
                CreatedAt = now,
                Items = quote.Items
                    .Where(i => i.Category != BOMCategory.Service)
                    .Select(i => new PackingOrderItem
                    {
                        ItemName = i.ItemName,
                        Category = i.Category,
                        Quantity = i.Quantity,
                        Unit = i.Unit,
                        IsPacked = false,
                        RequiresSerialNumber = i.Category is BOMCategory.Inverter or BOMCategory.Battery or BOMCategory.ChargeController
                    }).ToList()
            };
            db.PackingOrders.Add(packingOrder);
        }

        await db.SaveChangesAsync(ct);
        return Result.Success(MapToDto(quote));
    }

    public async Task<Result<PackingOrderDto>> GetPackingOrderByInstallationAsync(int installationId, CancellationToken ct = default)
    {
        var packingOrder = await db.PackingOrders
            .Include(p => p.Items)
            .Where(p => p.InstallationId == installationId)
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (packingOrder == null)
            return Result.Failure<PackingOrderDto>(QuoteErrors.PackingOrderNotFound(installationId));

        return Result.Success(MapPackingOrderToDto(packingOrder));
    }

    public async Task<Result<PackingOrderDto>> UpdatePackingItemAsync(int packingOrderId, int itemId, bool isPacked, string? serialNumber, CancellationToken ct = default)
    {
        var packingOrder = await db.PackingOrders
            .Include(p => p.Items)
            .FirstOrDefaultAsync(p => p.Id == packingOrderId, ct);

        if (packingOrder == null)
            return Result.Failure<PackingOrderDto>(QuoteErrors.PackingOrderNotFound(packingOrderId));

        var item = packingOrder.Items.FirstOrDefault(i => i.Id == itemId);
        if (item == null)
            return Result.Failure<PackingOrderDto>(new Error(ErrorKind.NotFound, "packing_item.not_found", $"Item {itemId} not found in packing order {packingOrderId}."));

        item.IsPacked = isPacked;
        if (!string.IsNullOrWhiteSpace(serialNumber))
        {
            var cleanSerial = serialNumber.Trim();
            var duplicate = await db.Warranties.AnyAsync(w => w.SerialNumber == cleanSerial && w.InstallationId != packingOrder.InstallationId, ct);
            if (duplicate)
                return Result.Failure<PackingOrderDto>(QuoteErrors.DuplicateSerialNumber(cleanSerial));

            item.SerialNumber = cleanSerial;
        }

        if (packingOrder.Items.All(i => i.IsPacked))
        {
            packingOrder.Status = PackingStatus.Packed;
            packingOrder.PackedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return Result.Success(MapPackingOrderToDto(packingOrder));
    }

    public async Task<Result<PackingOrderDto>> DispatchPackingOrderAsync(int packingOrderId, CancellationToken ct = default)
    {
        var packingOrder = await db.PackingOrders
            .Include(p => p.Items)
            .FirstOrDefaultAsync(p => p.Id == packingOrderId, ct);

        if (packingOrder == null)
            return Result.Failure<PackingOrderDto>(QuoteErrors.PackingOrderNotFound(packingOrderId));

        if (packingOrder.Status == PackingStatus.Dispatched || packingOrder.Status == PackingStatus.Delivered)
            return Result.Success(MapPackingOrderToDto(packingOrder));

        // Gate 1: All items must be packed
        var unpackedItems = packingOrder.Items.Where(i => !i.IsPacked).ToList();
        if (unpackedItems.Count > 0)
        {
            return Result.Failure<PackingOrderDto>(QuoteErrors.UnpackedItemsRemaining(unpackedItems.Count));
        }

        // Gate 2: High-value serialized items (Inverter, Battery, ChargeController) MUST have scanned serial numbers
        var missingSerials = packingOrder.Items
            .Where(i => i.RequiresSerialNumber && string.IsNullOrWhiteSpace(i.SerialNumber))
            .Select(i => i.ItemName)
            .ToList();

        if (missingSerials.Count > 0)
        {
            return Result.Failure<PackingOrderDto>(QuoteErrors.MissingSerialNumbers(string.Join(", ", missingSerials)));
        }

        // Gate 3: Serial numbers must be unique across all active systems
        var serials = packingOrder.Items
            .Where(i => i.RequiresSerialNumber && !string.IsNullOrWhiteSpace(i.SerialNumber))
            .Select(i => i.SerialNumber!.Trim())
            .ToList();

        var duplicateWarranty = await db.Warranties
            .FirstOrDefaultAsync(w => serials.Contains(w.SerialNumber) && w.InstallationId != packingOrder.InstallationId, ct);

        if (duplicateWarranty != null)
        {
            return Result.Failure<PackingOrderDto>(QuoteErrors.DuplicateSerialNumber(duplicateWarranty.SerialNumber));
        }

        var now = DateTime.UtcNow;
        packingOrder.Status = PackingStatus.Dispatched;
        packingOrder.DispatchedAt = now;

        await db.SaveChangesAsync(ct);
        return Result.Success(MapPackingOrderToDto(packingOrder));
    }

    public async Task<Result<PackingOrderDto>> DeliverPackingOrderAsync(int packingOrderId, CancellationToken ct = default)
    {
        var packingOrder = await db.PackingOrders
            .Include(p => p.Items)
            .Include(p => p.Installation)
                .ThenInclude(i => i.Customer)
            .FirstOrDefaultAsync(p => p.Id == packingOrderId, ct);

        if (packingOrder == null)
            return Result.Failure<PackingOrderDto>(QuoteErrors.PackingOrderNotFound(packingOrderId));

        if (packingOrder.Status == PackingStatus.Delivered)
            return Result.Success(MapPackingOrderToDto(packingOrder));

        // Ensure dispatched before delivered (or dispatch automatically if ready)
        if (packingOrder.Status == PackingStatus.Pending)
        {
            var dispatchResult = await DispatchPackingOrderAsync(packingOrderId, ct);
            if (!dispatchResult.IsSuccess)
                return dispatchResult;
        }

        var now = DateTime.UtcNow;
        packingOrder.Status = PackingStatus.Delivered;
        packingOrder.DeliveredAt = now;

        // Auto-start warranty clock for hardware units
        var existingWarranties = await db.Warranties
            .Where(w => w.InstallationId == packingOrder.InstallationId)
            .ToListAsync(ct);

        foreach (var item in packingOrder.Items)
        {
            // Solar Panels: 20-year warranty (Scene 3 & 5)
            if (item.Category == BOMCategory.SolarPanels)
            {
                var serial = !string.IsNullOrWhiteSpace(item.SerialNumber)
                    ? item.SerialNumber.Trim()
                    : $"PANEL-BATCH-INS{packingOrder.InstallationId}-{packingOrder.QuoteId}";

                if (!existingWarranties.Any(w => w.SerialNumber == serial && w.Category == BOMCategory.SolarPanels))
                {
                    db.Warranties.Add(new Warranty
                    {
                        InstallationId = packingOrder.InstallationId,
                        CustomerId = packingOrder.Installation.CustomerId,
                        ItemName = item.ItemName,
                        Category = item.Category,
                        SerialNumber = serial,
                        WarrantyYears = 20,
                        StartDate = now,
                        ExpiryDate = now.AddYears(20),
                        Status = WarrantyStatus.Active,
                        CreatedAt = now
                    });
                }
            }
            // Inverter, Battery, ChargeController: 2-year warranty (Scene 3 & 5)
            else if (item.RequiresSerialNumber && !string.IsNullOrWhiteSpace(item.SerialNumber))
            {
                var serial = item.SerialNumber.Trim();
                if (!existingWarranties.Any(w => w.SerialNumber == serial))
                {
                    db.Warranties.Add(new Warranty
                    {
                        InstallationId = packingOrder.InstallationId,
                        CustomerId = packingOrder.Installation.CustomerId,
                        ItemName = item.ItemName,
                        Category = item.Category,
                        SerialNumber = serial,
                        WarrantyYears = 2,
                        StartDate = now,
                        ExpiryDate = now.AddYears(2),
                        Status = WarrantyStatus.Active,
                        CreatedAt = now
                    });
                }
            }
        }

        await db.SaveChangesAsync(ct);
        return Result.Success(MapPackingOrderToDto(packingOrder));
    }

    public async Task<Result<IReadOnlyList<WarrantyDto>>> GetWarrantiesByInstallationAsync(int installationId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var warranties = await db.Warranties
            .Include(w => w.Customer)
            .Where(w => w.InstallationId == installationId)
            .OrderBy(w => w.Category)
            .ThenBy(w => w.ItemName)
            .Select(w => new WarrantyDto(
                w.Id,
                w.InstallationId,
                w.CustomerId,
                w.Customer.FullName,
                w.ItemName,
                w.Category.ToString(),
                w.SerialNumber,
                w.WarrantyYears,
                w.StartDate,
                w.ExpiryDate,
                w.Status.ToString(),
                w.IsCovered(now),
                w.RemainingDays(now)))
            .ToListAsync(ct);

        return Result.Success<IReadOnlyList<WarrantyDto>>(warranties);
    }

    public async Task<Result<WarrantyLookupResultDto>> LookupWarrantyAsync(string query, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return Result.Success(new WarrantyLookupResultDto(query, false, []));
        }

        var trimmed = query.Trim();
        var lower = trimmed.ToLower();
        var normalizedEmail = Emails.Normalize(trimmed);
        var now = DateTime.UtcNow;

        var warranties = await db.Warranties
            .Include(w => w.Customer)
            .Where(w =>
                w.SerialNumber.ToLower() == lower ||
                w.SerialNumber.ToLower().Contains(lower) ||
                w.Customer.NormalizedEmail == normalizedEmail ||
                w.Customer.PhoneNumber == trimmed ||
                w.Customer.FirstName.ToLower().Contains(lower) ||
                w.Customer.LastName.ToLower().Contains(lower))
            .OrderByDescending(w => w.CreatedAt)
            .Select(w => new WarrantyDto(
                w.Id,
                w.InstallationId,
                w.CustomerId,
                w.Customer.FullName,
                w.ItemName,
                w.Category.ToString(),
                w.SerialNumber,
                w.WarrantyYears,
                w.StartDate,
                w.ExpiryDate,
                w.Status.ToString(),
                w.IsCovered(now),
                w.RemainingDays(now)))
            .ToListAsync(ct);

        return Result.Success(new WarrantyLookupResultDto(query, warranties.Count > 0, warranties));
    }

    private static QuoteDto MapToDto(Quote q) => new(
        q.Id,
        q.InstallationId,
        q.SystemCapacityKw,
        q.SystemType.ToString(),
        q.BasePriceRupees,
        q.EstimatedSubsidyRupees,
        q.TotalAmountRupees,
        q.AdvancePercentage,
        q.AdvanceRequiredRupees,
        q.AmountPaidRupees,
        q.Status.ToString(),
        q.PaymentStatus.ToString(),
        q.Notes,
        q.PaymentReference,
        q.ReceiptPhotoUrl,
        q.CreatedAt,
        q.SentAt,
        q.AcceptedAt,
        q.PaidAt,
        q.Items.Select(i => new QuoteItemDto(
            i.Id,
            i.Category.ToString(),
            i.ItemName,
            i.Specification,
            i.Quantity,
            i.Unit,
            i.UnitCostRupees,
            i.TotalCostRupees)).ToList());

    private static PackingOrderDto MapPackingOrderToDto(PackingOrder p) => new(
        p.Id,
        p.InstallationId,
        p.QuoteId,
        p.Status.ToString(),
        p.CreatedAt,
        p.PackedAt,
        p.DispatchedAt,
        p.DeliveredAt,
        p.Items.Select(i => new PackingOrderItemDto(
            i.Id,
            i.ItemName,
            i.Category.ToString(),
            i.Quantity,
            i.Unit,
            i.IsPacked,
            i.RequiresSerialNumber,
            i.SerialNumber)).ToList());
}
