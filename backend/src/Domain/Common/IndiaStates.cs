namespace Domain.Common;

/// <summary>
/// Indian states and union territories by their standard two-letter codes (ISO 3166-2:IN).
/// </summary>
public static class IndiaStates
{
    public static readonly IReadOnlySet<string> Codes = new HashSet<string>(StringComparer.Ordinal)
    {
        "AN", "AP", "AR", "AS", "BR", "CH", "CG", "DN", "DL", "GA", "GJ", "HR", "HP", "JK", "JH", "KA",
        "KL", "LA", "LD", "MP", "MH", "MN", "ML", "MZ", "NL", "OD", "PY", "PB", "RJ", "SK", "TN", "TS",
        "TR", "UP", "UK", "WB"
    };

    public static readonly IReadOnlyDictionary<string, string> NamesByCode = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        ["AN"] = "Andaman and Nicobar Islands",
        ["AP"] = "Andhra Pradesh",
        ["AR"] = "Arunachal Pradesh",
        ["AS"] = "Assam",
        ["BR"] = "Bihar",
        ["CH"] = "Chandigarh",
        ["CG"] = "Chhattisgarh",
        ["DN"] = "Dadra and Nagar Haveli and Daman and Diu",
        ["DL"] = "Delhi",
        ["GA"] = "Goa",
        ["GJ"] = "Gujarat",
        ["HR"] = "Haryana",
        ["HP"] = "Himachal Pradesh",
        ["JK"] = "Jammu and Kashmir",
        ["JH"] = "Jharkhand",
        ["KA"] = "Karnataka",
        ["KL"] = "Kerala",
        ["LA"] = "Ladakh",
        ["LD"] = "Lakshadweep",
        ["MP"] = "Madhya Pradesh",
        ["MH"] = "Maharashtra",
        ["MN"] = "Manipur",
        ["ML"] = "Meghalaya",
        ["MZ"] = "Mizoram",
        ["NL"] = "Nagaland",
        ["OD"] = "Odisha",
        ["PY"] = "Puducherry",
        ["PB"] = "Punjab",
        ["RJ"] = "Rajasthan",
        ["SK"] = "Sikkim",
        ["TN"] = "Tamil Nadu",
        ["TS"] = "Telangana",
        ["TR"] = "Tripura",
        ["UP"] = "Uttar Pradesh",
        ["UK"] = "Uttarakhand",
        ["WB"] = "West Bengal",
    };

    public static bool IsCode(string? value) => value is not null && (Codes.Contains(value) || NamesByCode.ContainsKey(value));
}
