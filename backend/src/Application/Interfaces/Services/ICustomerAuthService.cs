using Application.Common.Models;
using Application.DTOs.CustomerAuth;

namespace Application.Interfaces.Services;

public record CustomerSignedIn(CustomerSessionResponse Customer, string Token, DateTimeOffset ExpiresAt);

public interface ICustomerAuthService
{
    Task<Result<bool>> RequestOtpAsync(RequestOtpRequest request, string? clientIp, string? siteUrl = null, CancellationToken cancellationToken = default);
    Task<Result<CustomerSignedIn>> VerifyOtpAsync(VerifyOtpRequest request, CancellationToken cancellationToken = default);
    Task<Result<VerifySignUpOtpResponse>> VerifySignUpOtpAsync(VerifyOtpRequest request, CancellationToken cancellationToken = default);
    Task<Result<CustomerSignedIn>> CompleteSignUpAsync(CompleteSignUpRequest request, CancellationToken cancellationToken = default);
    Task<Result<CustomerSignedIn>> LoginAsync(CustomerLoginRequest request, CancellationToken cancellationToken = default);
    Task<Result<CustomerSessionResponse>> GetCurrentCustomerAsync(int customerId, CancellationToken cancellationToken = default);
}
