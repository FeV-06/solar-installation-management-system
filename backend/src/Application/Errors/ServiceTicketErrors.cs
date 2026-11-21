using Application.Common.Models;

namespace Application.Errors;

public static class ServiceTicketErrors
{
    public static Error NotFound(int id) =>
        new(ErrorKind.NotFound, "service_ticket.not_found", $"Service ticket #{id} not found.");

    public static readonly Error InvalidStatus =
        new(ErrorKind.Conflict, "service_ticket.invalid_status", "The ticket is not in a valid state for this action.");

    public static readonly Error HardwareNotFound =
        new(ErrorKind.NotFound, "service_ticket.hardware_not_found", "The specified hardware serial number was not found for this installation.");

    public static readonly Error CannotCloseWithoutCustomerConfirmation =
        new(ErrorKind.Conflict, "service_ticket.closure_forbidden", "Ticket cannot be closed by staff alone: Homeowner must explicitly confirm power is restored.");

    public static readonly Error Unauthorized =
        new(ErrorKind.Unauthorized, "service_ticket.unauthorized", "You are not authorized to view or modify this ticket.");
}
