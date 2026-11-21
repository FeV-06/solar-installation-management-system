using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Application.Common.Models;
using Application.DTOs.CustomerAuth;
using Application.Errors;
using Application.Interfaces.Services;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Auth;
using Infrastructure.Data;
using Infrastructure.Services.Email;
using Infrastructure.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Infrastructure.Services;

public class CustomerAuthService(
    AppDbContext db,
    IEmailSender emailSender,
    IOptions<JwtOptions> jwtOptions,
    ILogger<CustomerAuthService> logger) : ICustomerAuthService
{
    private static readonly JsonWebTokenHandler TokenHandler = new();

    public async Task<Result<bool>> RequestOtpAsync(RequestOtpRequest request, string? clientIp, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@'))
            return Result.Failure<bool>(CustomerAuthErrors.InvalidEmail);

        var normalizedEmail = Emails.Normalize(request.Email);
        var now = DateTime.UtcNow;

        // Rate limiting check: check if an active OTP was created in the last 60 seconds
        var recentOtp = await db.CustomerOtps
            .Where(o => o.NormalizedEmail == normalizedEmail && o.CreatedAtUtc > now.AddSeconds(-60))
            .FirstOrDefaultAsync(cancellationToken);

        if (recentOtp != null)
            return Result.Failure<bool>(CustomerAuthErrors.RateLimited);

        // Invalidate any previous unconsumed OTPs for this email
        var previousOtps = await db.CustomerOtps
            .Where(o => o.NormalizedEmail == normalizedEmail && o.ConsumedAtUtc == null && o.ExpiresAtUtc > now)
            .ToListAsync(cancellationToken);

        foreach (var p in previousOtps)
            p.ConsumedAtUtc = now;

        // Generate cryptographically secure 6-digit OTP
        var otpNumber = RandomNumberGenerator.GetInt32(100000, 1000000);
        var otpString = otpNumber.ToString(CultureInfo.InvariantCulture);

        var salt = Convert.ToBase64String(RandomNumberGenerator.GetBytes(16));
        var hash = HashOtp(otpString, salt);

        var otpRecord = new CustomerOtp
        {
            Id = Guid.NewGuid(),
            NormalizedEmail = normalizedEmail,
            Email = request.Email.Trim(),
            OtpHash = hash,
            Salt = salt,
            FailedAttempts = 0,
            CreatedAtUtc = now,
            ExpiresAtUtc = now.AddMinutes(5),
            CreatedByIp = clientIp
        };

        db.CustomerOtps.Add(otpRecord);
        await db.SaveChangesAsync(cancellationToken);

        // Send Email via configured EmailSender
        var rendered = CustomerEmails.OtpVerification(otpString, request.Email.Trim(), 5);
        var emailMessage = new EmailMessage(
            $"CustomerOtp:{otpRecord.Id}",
            request.Email.Trim(),
            request.Email.Trim(),
            rendered.Subject,
            rendered.Html,
            rendered.Text);

        try
        {
            await emailSender.SendAsync(emailMessage, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send OTP verification email to {Email}", request.Email);
        }

        return Result.Success(true);
    }

    public async Task<Result<CustomerSignedIn>> VerifyOtpAsync(VerifyOtpRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Code))
            return Result.Failure<CustomerSignedIn>(CustomerAuthErrors.InvalidCode);

        var normalizedEmail = Emails.Normalize(request.Email);
        var now = DateTime.UtcNow;

        var otpRecord = await db.CustomerOtps
            .Where(o => o.NormalizedEmail == normalizedEmail && o.ConsumedAtUtc == null)
            .OrderByDescending(o => o.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (otpRecord == null)
            return Result.Failure<CustomerSignedIn>(CustomerAuthErrors.InvalidCode);

        if (otpRecord.IsExpired(now))
            return Result.Failure<CustomerSignedIn>(CustomerAuthErrors.CodeExpired);

        if (otpRecord.IsLockedOut)
            return Result.Failure<CustomerSignedIn>(CustomerAuthErrors.LockedOut);

        var computedHash = HashOtp(request.Code.Trim(), otpRecord.Salt);

        // Constant-time check
        if (!CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(computedHash),
            Encoding.UTF8.GetBytes(otpRecord.OtpHash)))
        {
            otpRecord.FailedAttempts++;
            await db.SaveChangesAsync(cancellationToken);

            return Result.Failure<CustomerSignedIn>(
                otpRecord.IsLockedOut ? CustomerAuthErrors.LockedOut : CustomerAuthErrors.InvalidCode);
        }

        // OTP verified successfully
        otpRecord.ConsumedAtUtc = now;

        // Find or create customer
        var customer = await db.Customers
            .FirstOrDefaultAsync(c => c.NormalizedEmail == normalizedEmail, cancellationToken);

        if (customer == null)
        {
            // Auto-provision initial customer entity
            customer = new Customer
            {
                Email = otpRecord.Email,
                NormalizedEmail = normalizedEmail,
                FirstName = "Customer",
                LastName = "",
                PhoneNumber = "",
                Status = CustomerStatus.Prospect,
                RegistrationDate = now,
                IsActive = true,
                LastLoginAt = now
            };
            db.Customers.Add(customer);
        }
        else
        {
            if (!customer.IsActive)
                return Result.Failure<CustomerSignedIn>(CustomerAuthErrors.Deactivated);

            customer.LastLoginAt = now;
        }

        await db.SaveChangesAsync(cancellationToken);

        var (token, expiresAt) = IssueCustomerToken(customer);
        var response = new CustomerSessionResponse(
            customer.Id,
            customer.Email,
            customer.FirstName,
            customer.LastName,
            customer.FullName);

        return Result.Success(new CustomerSignedIn(response, token, expiresAt));
    }

    public async Task<Result<CustomerSessionResponse>> GetCurrentCustomerAsync(int customerId, CancellationToken cancellationToken = default)
    {
        var customer = await db.Customers
            .FirstOrDefaultAsync(c => c.Id == customerId && c.IsActive, cancellationToken);

        if (customer == null)
            return Result.Failure<CustomerSessionResponse>(CustomerAuthErrors.SignedOut);

        return Result.Success(new CustomerSessionResponse(
            customer.Id,
            customer.Email,
            customer.FirstName,
            customer.LastName,
            customer.FullName));
    }

    private (string Token, DateTimeOffset ExpiresAt) IssueCustomerToken(Customer customer)
    {
        var jwt = jwtOptions.Value;
        var now = DateTimeOffset.UtcNow;
        var expiresAt = now.AddHours(jwt.LifetimeHours > 0 ? jwt.LifetimeHours : 8);

        var token = TokenHandler.CreateToken(new SecurityTokenDescriptor
        {
            Issuer = jwt.Issuer,
            Audience = "sol-customer",
            IssuedAt = now.UtcDateTime,
            NotBefore = now.UtcDateTime,
            Expires = expiresAt.UtcDateTime,
            Claims = new Dictionary<string, object>
            {
                [Session.UserIdClaim] = customer.Id.ToString(CultureInfo.InvariantCulture),
                [Session.EmailClaim] = customer.Email,
                [Session.RoleClaim] = Session.CustomerRole
            },
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret)), SecurityAlgorithms.HmacSha256)
        });

        return (token, expiresAt);
    }

    private static string HashOtp(string otp, string salt)
    {
        using var sha = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(otp + ":" + salt);
        var hash = sha.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }
}
