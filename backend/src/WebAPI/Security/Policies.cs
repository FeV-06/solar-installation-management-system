using Domain.Enums;
using Microsoft.AspNetCore.Authorization;

namespace WebAPI.Security;

/// <summary>
/// Who may call what (ADR 9). Every endpoint needs a signed-in account unless it says <c>[AllowAnonymous]</c>, so a new
/// endpoint is closed until someone opens it; the policies narrow an endpoint to a role.
/// </summary>
public static class Policies
{
    /// <summary>The office.</summary>
    public const string Admin = nameof(Admin);

    /// <summary>A technician.</summary>
    public const string Technician = nameof(Technician);

    /// <summary>Sales staff.</summary>
    public const string Sales = nameof(Sales);

    /// <summary>Admins and sales staff may read leads.</summary>
    public const string LeadReaders = nameof(LeadReaders);

    /// <summary>Any staff account: an Admin or a technician.</summary>
    public const string Staff = nameof(Staff);

    /// <summary>An authenticated customer.</summary>
    public const string Customer = nameof(Customer);

    public static IServiceCollection AddStaffPolicies(this IServiceCollection services)
    {
        services.AddAuthorizationBuilder()
            .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build())
            .AddPolicy(Admin, policy => policy.RequireRole(nameof(UserRole.Admin)))
            .AddPolicy(Technician, policy => policy.RequireRole(nameof(UserRole.Technician)))
            .AddPolicy(Sales, policy => policy.RequireRole(nameof(UserRole.Sales)))
            .AddPolicy(LeadReaders, policy => policy.RequireRole(nameof(UserRole.Admin), nameof(UserRole.Sales)))
            .AddPolicy(Staff, policy => policy.RequireRole(nameof(UserRole.Admin), nameof(UserRole.Technician)))
            .AddPolicy(Customer, policy => policy.RequireRole(Infrastructure.Auth.Session.CustomerRole));
        return services;
    }
}
