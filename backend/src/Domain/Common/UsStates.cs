namespace Domain.Common;

/// <summary>
/// States and Union Territories (both India and US supported).
/// </summary>
public static class UsStates
{
    public static readonly IReadOnlySet<string> Codes = new HashSet<string>(StringComparer.Ordinal)
    {
        // Indian States & Union Territories
        "AN", "AP", "AR", "AS", "BR", "CH", "CG", "DN", "DL", "GA", "GJ", "HR", "HP", "JK", "JH", "KA",
        "KL", "LA", "LD", "MP", "MH", "MN", "ML", "MZ", "NL", "OD", "PY", "PB", "RJ", "SK", "TN", "TS",
        "TR", "UP", "UK", "WB",

        // US States
        "AL", "AK", "AZ", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS",
        "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC",
        "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
    };

    public static bool IsCode(string? value) => value is not null && Codes.Contains(value);
}
