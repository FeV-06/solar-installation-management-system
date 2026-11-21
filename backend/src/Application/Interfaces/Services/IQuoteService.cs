using Application.Common.Models;
using Application.DTOs.Quote;

namespace Application.Interfaces.Services;

public interface IQuoteService
{
    Task<Result<QuoteDto>> GetByInstallationIdAsync(int installationId, CancellationToken ct = default);
    Task<Result<QuoteDto>> GetByIdAsync(int quoteId, CancellationToken ct = default);
    Task<Result<QuoteDto>> GenerateOrUpdateAsync(int installationId, GenerateQuoteRequest request, CancellationToken ct = default);
    Task<Result<QuoteDto>> SendQuoteAsync(int quoteId, CancellationToken ct = default);
    Task<Result<QuoteDto>> AcceptAndPayAsync(int quoteId, CustomerPayQuoteRequest request, int? customerId, CancellationToken ct = default);
    Task<Result<PackingOrderDto>> GetPackingOrderByInstallationAsync(int installationId, CancellationToken ct = default);
    Task<Result<PackingOrderDto>> UpdatePackingItemAsync(int packingOrderId, int itemId, bool isPacked, string? serialNumber, CancellationToken ct = default);
    Task<Result<PackingOrderDto>> DispatchPackingOrderAsync(int packingOrderId, CancellationToken ct = default);
    Task<Result<PackingOrderDto>> DeliverPackingOrderAsync(int packingOrderId, CancellationToken ct = default);
    Task<Result<IReadOnlyList<WarrantyDto>>> GetWarrantiesByInstallationAsync(int installationId, CancellationToken ct = default);
    Task<Result<WarrantyLookupResultDto>> LookupWarrantyAsync(string query, CancellationToken ct = default);
}
