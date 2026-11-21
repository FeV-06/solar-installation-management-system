namespace Application.DTOs.CustomerAuth;

public record RequestOtpRequest(string Email);

public record VerifyOtpRequest(string Email, string Code);

public record CustomerLoginRequest(string Email, string Password);

public record VerifySignUpOtpResponse(string VerificationTicket);

public record CompleteSignUpRequest(
    string Email,
    string VerificationTicket,
    string Password,
    string? FirstName = null,
    string? LastName = null);

public record CustomerSessionResponse(int Id, string Email, string FirstName, string LastName, string FullName);
