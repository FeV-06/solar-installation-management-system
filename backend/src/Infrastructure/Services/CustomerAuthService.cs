using System.Globalization;
using System.ComponentModel.DataAnnotations;
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
        if (string.IsNullOrWhiteSpace(request.Email) || request.Email.Trim().Length > 255 ||
            !new EmailAddressAttribute().IsValid(request.Email.Trim()))
            return Result.Failure<bool>(CustomerAuthErrors.InvalidEmail);

        var normalizedEmail = Emails.Normalize(request.Email);
        var now = DateTime.UtcNow;

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

        // A per-email transaction lock makes the cooldown and replacement atomic across concurrent requests.
        await using (var transaction = await db.Database.BeginTransactionAsync(cancellationToken))
        {
            await db.Database.ExecuteSqlAsync($"SELECT pg_advisory_xact_lock(hashtextextended({normalizedEmail}, 0))", cancellationToken);
            var recentOtp = await db.CustomerOtps.AnyAsync(o => o.NormalizedEmail == normalizedEmail &&
                o.ConsumedAtUtc == null && o.CreatedAtUtc > now.AddSeconds(-60), cancellationToken);
            if (recentOtp) return Result.Failure<bool>(CustomerAuthErrors.RateLimited);

            await db.CustomerOtps.Where(o => o.NormalizedEmail == normalizedEmail && o.ConsumedAtUtc == null)
                .ExecuteUpdateAsync(update => update.SetProperty(o => o.ConsumedAtUtc, now), cancellationToken);
            db.CustomerOtps.Add(otpRecord);
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }

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
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning("The customer verification email could not be sent ({ErrorType}).", ex.GetType().Name);
            otpRecord.ConsumedAtUtc = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
            return Result.Failure<bool>(CustomerAuthErrors.DeliveryUnavailable);
        }

        return Result.Success(true);
    }

    public async Task<Result<CustomerSignedIn>> VerifyOtpAsync(VerifyOtpRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || request.Email.Trim().Length > 255 ||
            string.IsNullOrWhiteSpace(request.Code) || request.Code.Length != 6 || request.Code.Any(c => c is < '0' or > '9'))
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
            try { await db.SaveChangesAsync(cancellationToken); }
            catch (DbUpdateConcurrencyException) { return Result.Failure<CustomerSignedIn>(CustomerAuthErrors.InvalidCode); }

            return Result.Failure<CustomerSignedIn>(
                otpRecord.IsLockedOut ? CustomerAuthErrors.LockedOut : CustomerAuthErrors.InvalidCode);
        }

        // OTP verified successfully
        otpRecord.ConsumedAtUtc = now;

        // Find or create customer
        var existing = await db.Customers.AsNoTracking()
            .FirstOrDefaultAsync(c => c.NormalizedEmail == normalizedEmail, cancellationToken);
        if (existing is { IsActive: false })
            return Result.Failure<CustomerSignedIn>(CustomerAuthErrors.Deactivated);

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            // Consume before issuing a session; the concurrency token permits only one successful verifier.
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Result.Failure<CustomerSignedIn>(CustomerAuthErrors.InvalidCode);
        }

        // A verified first-time customer may race with lead conversion; the email's unique key decides the winner.
        await db.Database.ExecuteSqlAsync($"""
            INSERT INTO customers (first_name, last_name, email, normalized_email, phone_number, status,
                                   registration_date, is_active, last_login_at)
            VALUES ({"Customer"}, {""}, {otpRecord.Email}, {normalizedEmail}, {""},
                    {CustomerStatus.Prospect.ToString()}, {now}, {true}, {now})
            ON CONFLICT (normalized_email) DO NOTHING
            """, cancellationToken);
        var customer = await db.Customers.SingleAsync(c => c.NormalizedEmail == normalizedEmail, cancellationToken);
        if (!customer.IsActive)
            return Result.Failure<CustomerSignedIn>(CustomerAuthErrors.Deactivated);
        customer.LastLoginAt = now;
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

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

    private string HashOtp(string otp, string salt)
    {
        var bytes = Encoding.UTF8.GetBytes(otp + ":" + salt);
        var hash = HMACSHA256.HashData(Encoding.UTF8.GetBytes(jwtOptions.Value.Secret), bytes);
        return Convert.ToBase64String(hash);
    }
}
