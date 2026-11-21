using Application.DTOs.CustomerPortal;
using Application.DTOs.Lead;
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
public class CustomerPortalController(ICustomerPortalService service, ICustomerAuthService auth, ILeadService leads) : ApiControllerBase
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
}
