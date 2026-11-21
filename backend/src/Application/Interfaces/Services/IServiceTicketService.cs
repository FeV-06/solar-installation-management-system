using Application.Common.Models;
using Application.DTOs.ServiceTickets;

namespace Application.Interfaces.Services;

public interface IServiceTicketService
{
    Task<Result<IReadOnlyList<ServiceTicketDto>>> GetAllAsync(string? status = null, CancellationToken ct = default);
    Task<Result<IReadOnlyList<ServiceTicketDto>>> GetByCustomerAsync(int customerId, CancellationToken ct = default);
    Task<Result<ServiceTicketDto>> GetByIdAsync(int id, CancellationToken ct = default);

    Task<Result<ServiceTicketDto>> CreateTicketAsync(CreateServiceTicketRequest request, int customerId, CancellationToken ct = default);
    Task<Result<ServiceTicketDto>> ReviewTicketAsync(int id, ReviewServiceTicketRequest request, CancellationToken ct = default);
    Task<Result<ServiceTicketDto>> CustomerApproveTicketAsync(int id, int customerId, ApproveServiceTicketRequest request, CancellationToken ct = default);
    Task<Result<ServiceTicketDto>> TechnicianResolveTicketAsync(int id, int technicianUserId, ResolveServiceTicketRequest request, CancellationToken ct = default);
    Task<Result<ServiceTicketDto>> CustomerConfirmRestorationAsync(int id, int customerId, ConfirmServiceTicketRequest request, CancellationToken ct = default);
}
