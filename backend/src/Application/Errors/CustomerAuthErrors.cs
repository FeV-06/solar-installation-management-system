using Application.Common.Models;

namespace Application.Errors;

public static class CustomerAuthErrors
{
    public static readonly Error InvalidEmail =
        new(ErrorKind.Invalid, "customer_auth.invalid_email", "Please provide a valid email address.", "Email");

    public static readonly Error RateLimited =
        new(ErrorKind.Invalid, "customer_auth.rate_limited", "Please wait before requesting another code.");

    public static readonly Error InvalidCode =
        new(ErrorKind.Invalid, "customer_auth.invalid_code", "The verification code is incorrect or has expired.", "Code");

    public static readonly Error DeliveryUnavailable =
        new(ErrorKind.Invalid, "customer_auth.delivery_unavailable", "We couldn't send the code. Please try again later.", "Email");

    public static readonly Error CodeExpired =
        new(ErrorKind.Invalid, "customer_auth.code_expired", "This verification code has expired. Please request a new one.");

    public static readonly Error LockedOut =
        new(ErrorKind.Invalid, "customer_auth.locked_out", "Too many incorrect attempts. Please request a new verification code.");

    public static readonly Error SignedOut =
        new(ErrorKind.Unauthorized, "customer_auth.signed_out", "You are not signed in.");

    public static readonly Error Deactivated =
        new(ErrorKind.Unauthorized, "customer_auth.deactivated", "This account has been deactivated.");
}
