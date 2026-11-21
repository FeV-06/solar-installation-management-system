using Domain.Entities;

namespace Application.DTOs.Installations;

public sealed class SubmitInstallationProofRequest
{
    public DateTime WorkStartedAt { get; set; }
    public DateTime WorkCompletedAt { get; set; }

    public decimal SystemCapacityKw { get; set; }
    public decimal TestedGenerationKw { get; set; }
    public bool GridConnected { get; set; } = true;

    public string PanelArrayPhotoUrl { get; set; } = string.Empty;
    public string InverterPhotoUrl { get; set; } = string.Empty;
    public string MeterPhotoUrl { get; set; } = string.Empty;

    public string CustomerSignatureData { get; set; } = string.Empty;
    public string SignedByName { get; set; } = string.Empty;
    public DateTime SignedAt { get; set; }
}

public sealed record InstallationProofResponse(
    int Id,
    int InstallationId,
    int TechnicianId,
    string TechnicianName,
    DateTime WorkStartedAt,
    DateTime WorkCompletedAt,
    double LaborHours,
    decimal SystemCapacityKw,
    decimal TestedGenerationKw,
    bool GridConnected,
    string PanelArrayPhotoUrl,
    string InverterPhotoUrl,
    string MeterPhotoUrl,
    string CustomerSignatureData,
    string SignedByName,
    DateTime SignedAt,
    DateTime CreatedAt
)
{
    public static InstallationProofResponse From(InstallationProof proof) => new(
        proof.Id,
        proof.InstallationId,
        proof.TechnicianId,
        proof.Technician?.Name ?? "Technician",
        proof.WorkStartedAt,
        proof.WorkCompletedAt,
        proof.LaborHours,
        proof.SystemCapacityKw,
        proof.TestedGenerationKw,
        proof.GridConnected,
        proof.PanelArrayPhotoUrl,
        proof.InverterPhotoUrl,
        proof.MeterPhotoUrl,
        proof.CustomerSignatureData,
        proof.SignedByName,
        proof.SignedAt,
        proof.CreatedAt
    );
}
