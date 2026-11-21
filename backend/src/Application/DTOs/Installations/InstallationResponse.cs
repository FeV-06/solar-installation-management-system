using Application.DTOs.Common;
using Domain.Entities;

namespace Application.DTOs.Installations;

public sealed record InstallationResponse(int Id, int CustomerId, string CustomerName, string CustomerPhone,
    AddressResponse Address, int LeadId, string Status, string TimeZone, DateTime CreatedAt)
{
    public static InstallationResponse From(Installation installation) => new(installation.Id, installation.CustomerId,
        installation.Customer.FullName, installation.Customer.PhoneNumber, AddressResponse.From(installation.Address),
        installation.LeadId, installation.Status.ToString(), installation.TimeZone, installation.CreatedAt);
}
