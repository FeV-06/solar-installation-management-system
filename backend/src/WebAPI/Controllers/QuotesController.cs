using Application.DTOs.Quote;
using Application.Errors;
using Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAPI.Security;

namespace WebAPI.Controllers;

/// <summary>
/// Quotations, Bill of Materials and Warehouse Packing Orders for installations.
/// </summary>
[Route("api")]
[Authorize(Policy = Policies.Staff)]
public class QuotesController(IQuoteService service) : ApiControllerBase
{
    public record UpdatePackingItemRequest(bool IsPacked, string? SerialNumber);

    [HttpGet("installations/{installationId:int}/quote")]
    public async Task<ActionResult<QuoteDto>> GetByInstallation(int installationId, CancellationToken ct)
    {
        if (CurrentUserId is null) return Problem(AuthErrors.SignedOut);
        var result = await service.GetByInstallationIdAsync(installationId, ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    [HttpPost("installations/{installationId:int}/quote")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<ActionResult<QuoteDto>> GenerateOrUpdate(int installationId, [FromBody] GenerateQuoteRequest request, CancellationToken ct)
    {
        if (CurrentUserId is null) return Problem(AuthErrors.SignedOut);
        var result = await service.GenerateOrUpdateAsync(installationId, request, ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    [HttpPut("quotes/{quoteId:int}/send")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<ActionResult<QuoteDto>> Send(int quoteId, CancellationToken ct)
    {
        if (CurrentUserId is null) return Problem(AuthErrors.SignedOut);
        var result = await service.SendQuoteAsync(quoteId, ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    [HttpGet("installations/{installationId:int}/packing-order")]
    public async Task<ActionResult<PackingOrderDto>> GetPackingOrder(int installationId, CancellationToken ct)
    {
        if (CurrentUserId is null) return Problem(AuthErrors.SignedOut);
        var result = await service.GetPackingOrderByInstallationAsync(installationId, ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    [HttpPut("packing-orders/{packingOrderId:int}/items/{itemId:int}")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<ActionResult<PackingOrderDto>> UpdatePackingItem(
        int packingOrderId,
        int itemId,
        [FromBody] UpdatePackingItemRequest request,
        CancellationToken ct)
    {
        if (CurrentUserId is null) return Problem(AuthErrors.SignedOut);
        var result = await service.UpdatePackingItemAsync(packingOrderId, itemId, request.IsPacked, request.SerialNumber, ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }
}
