using System.Diagnostics;
using Application.Common.Models;
using Application.Interfaces.Services;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Services.Email;
using Infrastructure.Settings;
using Microsoft.Extensions.Options;

namespace Infrastructure.Services;

/// <summary>
/// Renders a new lead's two emails (<see cref="LeadEmails"/>) and sends them through <see cref="IEmailSender"/>. Each
/// carries the key of the notification it delivers, <c>LeadWelcome:{leadId}</c> and <c>SalesNewLeadAlert:{leadId}</c>,
/// and the outbox message's id when the outbox sends it.
/// </summary>
public class EmailService(IEmailSender sender, IOptions<EmailOptions> options) : IEmailService
{
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<int, string> LeadSiteUrls = new();

    public static void RecordLeadSiteUrl(int leadId, string? url)
    {
        if (!string.IsNullOrWhiteSpace(url) && Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            LeadSiteUrls[leadId] = uri.GetLeftPart(UriPartial.Authority);
        }
    }

    private readonly EmailOptions _settings = options.Value;

    public EmailAddress RecipientOf(OutboxMessageType type, Lead lead) => type switch
    {
        OutboxMessageType.LeadWelcome => new EmailAddress(lead.Email, FullName(lead)),
        OutboxMessageType.SalesNewLeadAlert => new EmailAddress(_settings.FromAddress, _settings.FromName),
        var other => throw new UnreachableException($"No recipient for the outbox message type {other}.")
    };

    public async Task SendLeadWelcomeAsync(Lead lead, Guid? outboxMessageId = null,
        CancellationToken cancellationToken = default)
    {
        var siteUrl = LeadSiteUrls.TryRemove(lead.Id, out var captured) ? captured : _settings.SiteUrl;
        var email = LeadEmails.Welcome(lead, siteUrl);
        var to = RecipientOf(OutboxMessageType.LeadWelcome, lead);
        await sender.SendAsync(new EmailMessage($"LeadWelcome:{lead.Id}", to.Address, to.Name, email.Subject,
            email.Html, email.Text) { OutboxMessageId = outboxMessageId, InlineImages = [Wordmark.Image] },
            cancellationToken);
    }

    public async Task SendNewLeadAlertAsync(Lead lead, Guid? outboxMessageId = null,
        CancellationToken cancellationToken = default)
    {
        // To the office's own address; a reply goes to the person
        var email = LeadEmails.NewLeadAlert(lead);
        var to = RecipientOf(OutboxMessageType.SalesNewLeadAlert, lead);
        await sender.SendAsync(new EmailMessage($"SalesNewLeadAlert:{lead.Id}", to.Address, to.Name, email.Subject,
            email.Html, email.Text)
        {
            OutboxMessageId = outboxMessageId,
            ReplyTo = new EmailAddress(lead.Email, FullName(lead)),
            InlineImages = [Wordmark.Image]
        }, cancellationToken);
    }

    private static string FullName(Lead lead) => $"{lead.FirstName} {lead.LastName}";
}
