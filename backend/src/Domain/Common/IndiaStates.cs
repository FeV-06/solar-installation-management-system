namespace Domain.Common;

/// <summary>India's states and union territories by the codes used by the customer form.</summary>
public static class IndiaStates
{
    public static readonly IReadOnlySet<string> Codes = new HashSet<string>(StringComparer.Ordinal)
    {
        "AN", "AP", "AR", "AS", "BR", "CH", "CG", "DN", "DL", "GA", "GJ", "HR", "HP", "JK", "JH", "KA",
        "KL", "LA", "LD", "MP", "MH", "MN", "ML", "MZ", "NL", "OD", "PY", "PB", "RJ", "SK", "TN", "TS",
        "TR", "UP", "UK", "WB"
    };

    public static bool IsCode(string? value) => value is not null && Codes.Contains(value);
}
