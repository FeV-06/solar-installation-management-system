using Application.DTOs.CustomerAuth;
using Application.Errors;
using Application.Interfaces.Services;
using Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using WebAPI.Security;

namespace WebAPI.Controllers;

[Route("api/customer-auth")]
public class CustomerAuthController(ICustomerAuthService service) : ApiControllerBase
{
    [HttpPost("request-otp")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimits.CustomerOtpRequest)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RequestOtp([FromBody] RequestOtpRequest request)
    {
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await service.RequestOtpAsync(request, clientIp);
        return result.IsSuccess ? Ok(new { success = true, message = "If the email is valid, a verification code has been sent." }) : Problem(result.Error);
    }

    [HttpPost("verify-otp")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimits.CustomerOtpVerify)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CustomerSessionResponse>> VerifyOtp([FromBody] VerifyOtpRequest request)
    {
        var result = await service.VerifyOtpAsync(request);
        if (!result.IsSuccess)
            return Problem(result.Error);

        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Path = "/api",
            Expires = result.Value.ExpiresAt
        };

        Response.Cookies.Append(Session.CustomerCookieName, result.Value.Token, cookieOptions);
        return Ok(result.Value.Customer);
    }

    [HttpGet("me")]
    [Authorize(Policy = Policies.Customer)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<CustomerSessionResponse>> Me()
    {
        if (CurrentUserId is not { } customerId)
            return Unauthorized();

        var result = await service.GetCurrentCustomerAsync(customerId);
        return result.IsSuccess ? Ok(result.Value) : Unauthorized();
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    [EnableCors(CrossSiteCalls.QuoteForm)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public IActionResult Logout()
    {
        Response.Cookies.Delete(Session.CustomerCookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Path = "/api"
        });
        return NoContent();
    }
}
