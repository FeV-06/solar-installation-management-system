using Application.DTOs.CustomerPortal;
using Application.DTOs.Lead;
using Application.DTOs.Quote;
using Application.DTOs.ServiceTickets;
using Application.Errors;
using Application.Interfaces.Services;
using Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using WebAPI.Security;

namespace WebAPI.Controllers;

[Route("api/customer-portal")]
[Authorize(Policy = Policies.Customer)]
public class CustomerPortalController(
    ICustomerPortalService service,
    ICustomerAuthService auth,
    ILeadService leads,
    IQuoteService quotes,
    IServiceTicketService tickets) : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<CustomerPortalData>> GetPortalData()
    {
        if (CurrentUserId is not { } customerId)
            return Problem(CustomerAuthErrors.SignedOut);

        var result = await service.GetPortalDataAsync(customerId);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    /// <summary>Submit a quote request for the signed-in customer, never for a caller-supplied email.</summary>
    [HttpPost("quote-requests")]
    [EnableRateLimiting(RateLimits.QuoteForm)]
    public async Task<ActionResult<LeadCreatedResponse>> CreateQuoteRequest([FromBody] CreateLeadRequest request)
    {
        if (CurrentUserId is not { } customerId) return Problem(CustomerAuthErrors.SignedOut);
        var customer = await auth.GetCurrentCustomerAsync(customerId);
        if (!customer.IsSuccess) return Problem(customer.Error);
        request.Email = customer.Value.Email;
        var created = await leads.CreateForCustomerAsync(request, customerId);
        var body = new LeadCreatedResponse(created.Id);
        return created.IsNew ? StatusCode(StatusCodes.Status201Created, body) : Ok(body);
    }

    /// <summary>Accept and pay (Advance or Full) for an issued proposal.</summary>
    [HttpPost("quotes/{quoteId:int}/pay")]
    public async Task<ActionResult<QuoteDto>> PayQuote(int quoteId, [FromBody] CustomerPayQuoteRequest request, CancellationToken ct)
    {
        if (CurrentUserId is not { } customerId) return Problem(CustomerAuthErrors.SignedOut);
        var result = await quotes.AcceptAndPayAsync(quoteId, request, customerId, ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    /// <summary>Get detailed proposal and BOM for the customer.</summary>
    [HttpGet("quotes/{quoteId:int}")]
    public async Task<ActionResult<QuoteDto>> GetQuote(int quoteId, CancellationToken ct)
    {
        if (CurrentUserId is not { } customerId) return Problem(CustomerAuthErrors.SignedOut);
        var result = await quotes.GetByIdAsync(quoteId, ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    /// <summary>List post-sales service and warranty breakdown tickets for the signed-in customer.</summary>
    [HttpGet("tickets")]
    public async Task<ActionResult<IReadOnlyList<ServiceTicketDto>>> GetTickets(CancellationToken ct)
    {
        if (CurrentUserId is not { } customerId) return Problem(CustomerAuthErrors.SignedOut);
        var result = await tickets.GetByCustomerAsync(customerId, ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    /// <summary>Submit a new warranty breakdown or damage ticket (Scene 5).</summary>
    [HttpPost("tickets")]
    public async Task<ActionResult<ServiceTicketDto>> CreateTicket([FromBody] CreateServiceTicketRequest request, CancellationToken ct)
    {
        if (CurrentUserId is not { } customerId) return Problem(CustomerAuthErrors.SignedOut);
        var result = await tickets.CreateTicketAsync(request, customerId, ct);
        return result.IsSuccess ? StatusCode(StatusCodes.Status201Created, result.Value) : Problem(result.Error);
    }

    /// <summary>Approve replacement and billing terms (or ₹0 warranty) to initiate warehouse packing.</summary>
    [HttpPost("tickets/{id:int}/approve")]
    public async Task<ActionResult<ServiceTicketDto>> ApproveTicket(int id, [FromBody] ApproveServiceTicketRequest request, CancellationToken ct)
    {
        if (CurrentUserId is not { } customerId) return Problem(CustomerAuthErrors.SignedOut);
        var result = await tickets.CustomerApproveTicketAsync(id, customerId, request, ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    /// <summary>Homeowner final signoff: Confirms solar power is restored and closes the ticket.</summary>
    [HttpPost("tickets/{id:int}/confirm")]
    public async Task<ActionResult<ServiceTicketDto>> ConfirmRestoration(int id, [FromBody] ConfirmServiceTicketRequest request, CancellationToken ct)
    {
        if (CurrentUserId is not { } customerId) return Problem(CustomerAuthErrors.SignedOut);
        var result = await tickets.CustomerConfirmRestorationAsync(id, customerId, request, ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }
}
