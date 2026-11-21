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

    public static readonly Error CodeExpired =
        new(ErrorKind.Invalid, "customer_auth.code_expired", "This verification code has expired. Please request a new one.");

    public static readonly Error LockedOut =
        new(ErrorKind.Invalid, "customer_auth.locked_out", "Too many incorrect attempts. Please request a new verification code.");

    public static readonly Error DeliveryUnavailable =
        new(ErrorKind.Invalid, "customer_auth.delivery_unavailable", "We could not deliver a verification email right now. Please try again in a few minutes.");

    public static readonly Error SignedOut =
        new(ErrorKind.Unauthorized, "customer_auth.signed_out", "You are not signed in.");

    public static readonly Error Deactivated =
        new(ErrorKind.Unauthorized, "customer_auth.deactivated", "This account has been deactivated.");

    public static readonly Error InvalidCredentials =
        new(ErrorKind.Unauthorized, "customer_auth.invalid_credentials", "The email or password is incorrect.");

    public static readonly Error InvalidTicket =
        new(ErrorKind.Invalid, "customer_auth.invalid_ticket", "Your verification session has expired. Please verify your email again.");

    public static readonly Error PasswordTooShort =
        new(ErrorKind.Invalid, "customer_auth.password_too_short", "Password must be at least 8 characters long.", "Password");
}
