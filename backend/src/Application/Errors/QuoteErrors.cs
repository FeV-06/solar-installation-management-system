using Application.Common.Models;

namespace Application.Errors;

public static class QuoteErrors
{
    public static Error NotFound(int id) => new(ErrorKind.NotFound, "quote.not_found", $"Quote with ID {id} not found.");
    public static Error InstallationNotFound(int id) => new(ErrorKind.NotFound, "installation.not_found", $"Installation with ID {id} not found.");
    public static Error PackingOrderNotFound(int id) => new(ErrorKind.NotFound, "packing_order.not_found", $"Packing order with ID {id} not found.");

    public static readonly Error SurveyNotApproved = new(ErrorKind.Conflict, "quote.survey_not_approved", "A customer quote can only be generated or viewed after the site survey has been approved.");
    public static readonly Error InvalidStatus = new(ErrorKind.Conflict, "quote.invalid_status", "The quote is not in a valid state for this action.");
    public static readonly Error AlreadyPaid = new(ErrorKind.Conflict, "quote.already_paid", "This quote has already been accepted and paid.");
    public static readonly Error InvalidPaymentType = new(ErrorKind.Invalid, "quote.invalid_payment_type", "Payment type must be 'Advance' or 'Full'.", "PaymentType");
    public static readonly Error Unauthorized = new(ErrorKind.Unauthorized, "quote.unauthorized", "You are not authorized to view or accept this quote.");
    public static readonly Error Concurrency = new(ErrorKind.Conflict, "quote.concurrency", "The quote or installation was modified concurrently. Please reload.");
}
