using Application.DTOs.CustomerAuth;
using Application.Errors;
using Application.Interfaces.Services;
using Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using WebAPI.Security;

namespace WebAPI.Controllers;

[Route("api/customer-auth")]
public class CustomerAuthController(ICustomerAuthService service) : ApiControllerBase
{
    [HttpPost("request-otp")]
    [AllowAnonymous]
    [EnableCors(CrossSiteCalls.QuoteForm)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RequestOtp([FromBody] RequestOtpRequest request)
    {
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await service.RequestOtpAsync(request, clientIp);
        return result.IsSuccess
            ? Ok(new { success = true, message = "If the email is valid, a verification code has been sent." })
            : Problem(result.Error);
    }

    [HttpPost("verify-otp")]
    [AllowAnonymous]
    [EnableCors(CrossSiteCalls.QuoteForm)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CustomerSessionResponse>> VerifyOtp([FromBody] VerifyOtpRequest request)
    {
        var result = await service.VerifyOtpAsync(request);
        if (!result.IsSuccess)
            return Problem(result.Error);

        AppendSessionCookie(result.Value.Token, result.Value.ExpiresAt);
        return Ok(result.Value.Customer);
    }

    [HttpPost("verify-signup-otp")]
    [AllowAnonymous]
    [EnableCors(CrossSiteCalls.QuoteForm)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<VerifySignUpOtpResponse>> VerifySignUpOtp([FromBody] VerifyOtpRequest request)
    {
        var result = await service.VerifySignUpOtpAsync(request);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    [HttpPost("complete-signup")]
    [AllowAnonymous]
    [EnableCors(CrossSiteCalls.QuoteForm)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CustomerSessionResponse>> CompleteSignUp([FromBody] CompleteSignUpRequest request)
    {
        var result = await service.CompleteSignUpAsync(request);
        if (!result.IsSuccess)
            return Problem(result.Error);

        AppendSessionCookie(result.Value.Token, result.Value.ExpiresAt);
        return Ok(result.Value.Customer);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableCors(CrossSiteCalls.QuoteForm)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<CustomerSessionResponse>> Login([FromBody] CustomerLoginRequest request)
    {
        var result = await service.LoginAsync(request);
        if (!result.IsSuccess)
            return Problem(result.Error);

        AppendSessionCookie(result.Value.Token, result.Value.ExpiresAt);
        return Ok(result.Value.Customer);
    }

    [HttpGet("me")]
    [Authorize(Roles = Session.CustomerRole)]
    [EnableCors(CrossSiteCalls.QuoteForm)]
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
            SameSite = SameSiteMode.Lax
        });
        return NoContent();
    }

    private void AppendSessionCookie(string token, DateTimeOffset expiresAt)
    {
        Response.Cookies.Append(Session.CustomerCookieName, token, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Expires = expiresAt
        });
    }
}
