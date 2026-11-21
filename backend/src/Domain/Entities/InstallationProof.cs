namespace Domain.Entities;

/// <summary>
/// Photographic and digital sign-off evidence captured on the roof by the technician
/// upon commissioning the solar installation and completing homeowner handover.
/// </summary>
public class InstallationProof
{
    public int Id { get; set; }

    public int InstallationId { get; set; }
    public Installation Installation { get; set; } = null!;

    public int TechnicianId { get; set; }
    public User Technician { get; set; } = null!;

    public DateTime WorkStartedAt { get; set; }
    public DateTime WorkCompletedAt { get; set; }

    /// <summary>Installed nameplate capacity in kilowatts (e.g. 3.30 kW).</summary>
    public decimal SystemCapacityKw { get; set; }

    /// <summary>Measured live power generation in kilowatts during commissioning test (e.g. 2.85 kW).</summary>
    public decimal TestedGenerationKw { get; set; }

    /// <summary>Whether the inverter is synchronized with the utility grid and export voltage is verified.</summary>
    public bool GridConnected { get; set; } = true;

    /// <summary>Photo URL / base64 image data of the rooftop solar panel array.</summary>
    public string PanelArrayPhotoUrl { get; set; } = string.Empty;

    /// <summary>Photo URL / base64 image data of the inverter, DCDB, and ACDB junction box cabling.</summary>
    public string InverterPhotoUrl { get; set; } = string.Empty;

    /// <summary>Photo URL / base64 image data of the bi-directional net meter and chemical earthing pit.</summary>
    public string MeterPhotoUrl { get; set; } = string.Empty;

    /// <summary>Interactive HTML5 canvas digital signature data URL from the homeowner screen sign-off.</summary>
    public string CustomerSignatureData { get; set; } = string.Empty;

    public string SignedByName { get; set; } = string.Empty;
    public DateTime SignedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Calculates total duration spent on the roof in hours.</summary>
    public double LaborHours => Math.Max(0.5, Math.Round((WorkCompletedAt - WorkStartedAt).TotalHours, 2));
}
