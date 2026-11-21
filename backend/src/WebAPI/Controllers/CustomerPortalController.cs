using Application.DTOs.CustomerPortal;
using Application.Errors;
using Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using WebAPI.Security;

namespace WebAPI.Controllers;

[Route("api/customer-portal")]
[Authorize(Policy = Policies.Customer)]
[EnableCors(CrossSiteCalls.QuoteForm)]
public class CustomerPortalController(ICustomerPortalService service) : ApiControllerBase
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
}
