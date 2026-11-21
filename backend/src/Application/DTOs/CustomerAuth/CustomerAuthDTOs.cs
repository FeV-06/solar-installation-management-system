namespace Application.DTOs.CustomerAuth;

public record RequestOtpRequest(string Email);

public record VerifyOtpRequest(string Email, string Code);

public record CustomerSessionResponse(int Id, string Email, string FirstName, string LastName, string FullName);
