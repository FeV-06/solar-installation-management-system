using System.Net;

namespace Infrastructure.Services.Email;

public static class CustomerEmails
{
    private const string Night = "#040405", Limestone = "#f4f2ed", Raised = "#f9f6ef", Ink = "#0b0b0c",
        Muted = "#484746", Faint = "#646362", Line = "#cfcdc9", Sun = "#ffc21f", SunDeep = "#8a5a00";

    private const string Sans = "Arial,Helvetica,sans-serif";
    private const string Mono = "ui-monospace,Menlo,Consolas,'Courier New',monospace";

    public static RenderedEmail OtpVerification(string otp, string recipientEmail, int expiryMinutes = 5)
    {
        var subject = "Your Sol verification code";
        var preheader = $"Use this code to sign in to your Sol customer account. Valid for {expiryMinutes} minutes.";

        var html = $@"<!DOCTYPE html>
<html lang=""en"">
<head>
  <meta charset=""UTF-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
  <title>{WebUtility.HtmlEncode(subject)}</title>
</head>
<body style=""margin:0;padding:0;background-color:{Limestone};font-family:{Sans};color:{Ink};"">
  <table role=""presentation"" width=""100%"" border=""0"" cellpadding=""0"" cellspacing=""0"" style=""background-color:{Limestone};padding:32px 16px;"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""100%"" style=""max-width:540px;background-color:#ffffff;border-radius:12px;border:1px solid {Line};overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);"" cellpadding=""0"" cellspacing=""0"">
          <!-- Header -->
          <tr>
            <td style=""background-color:{Night};padding:24px 32px;text-align:left;"">
              <span style=""color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:1px;"">SOL<span style=""color:{Sun};"">.</span></span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style=""padding:36px 32px 24px 32px;"">
              <h1 style=""font-size:22px;font-weight:bold;color:{Ink};margin:0 0 16px 0;"">Your Verification Code</h1>
              <p style=""font-size:15px;line-height:24px;color:{Muted};margin:0 0 24px 0;"">
                Hello,<br>
                Please enter the following one-time code to sign in to your Sol customer portal:
              </p>

              <!-- Code block -->
              <div style=""background-color:{Raised};border:2px dashed {Sun};border-radius:8px;padding:20px;text-align:center;margin:0 0 24px 0;"">
                <span style=""font-family:{Mono};font-size:36px;font-weight:bold;letter-spacing:8px;color:{SunDeep};"">{WebUtility.HtmlEncode(otp)}</span>
              </div>

              <p style=""font-size:13px;line-height:20px;color:{Faint};margin:0 0 16px 0;"">
                This code will expire in <strong>{expiryMinutes} minutes</strong>. If you did not request this sign-in, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style=""background-color:{Raised};border-top:1px solid {Line};padding:20px 32px;text-align:center;"">
              <p style=""font-size:12px;color:{Faint};margin:0;"">
                Sol Energy &bull; Solar Installation & Customer Services<br>
                This is an automated security notification sent to {WebUtility.HtmlEncode(recipientEmail)}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";

        var text = $"SOL ENERGY - VERIFICATION CODE\n\nYour code: {otp}\n\nUse this code to sign in to your Sol customer portal. This code expires in {expiryMinutes} minutes.\n\nIf you did not request this code, you can safely ignore this email.\n\nSent to: {recipientEmail}";

        return new RenderedEmail(subject, preheader, html, text);
    }
}
