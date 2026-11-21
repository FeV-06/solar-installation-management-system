namespace Infrastructure.Auth;

/// <summary>What a staff session is made of: the cookie that carries its token, and the token's claims (ADR 7).</summary>
public static class Session
{
    /// <summary>The cookie the staff app's browser sends with every API request; its code never reads it.</summary>
    public const string CookieName = "sol_session";

    /// <summary>The account's ID.</summary>
    public const string UserIdClaim = "sub";

    public const string EmailClaim = "email";

    /// <summary>Admin or Technician; authorization reads it.</summary>
    public const string RoleClaim = "role";

    /// <summary>The cookie the customer portal sends with every API request.</summary>
    public const string CustomerCookieName = "sol_customer_session";

    /// <summary>Role value for customer JWT claims.</summary>
    public const string CustomerRole = "Customer";
}
