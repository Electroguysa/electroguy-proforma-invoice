import { BRAND, getEmailConfig, normalizePaymentDetails } from "./config.mjs";
import { compactOrderNumber } from "./money.mjs";

export function buildProformaEmail(order, options = {}) {
  const invoiceNumber = `EG-${compactOrderNumber(order.name)}`;
  const customerName = order.customerName || "Customer";
  const payment = normalizePaymentDetails(options.paymentDetails);
  if (!payment.paymentReference) payment.paymentReference = invoiceNumber;

  const subject = `Your ElectroGuy proforma invoice is ready - ${invoiceNumber} Payment Required`;
  const previewText = `Thank you for your order ${order.name}. Your ElectroGuy proforma invoice is attached.`;

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;background:#f4f2ec;color:#151515;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(previewText)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ec;padding:34px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;background:#ffffff;border-top:5px solid #bdec34;">
            <tr>
              <td style="padding:34px 42px 22px 42px;background:#050505;">
                <img src="${BRAND.website}/cdn/shop/files/electroguy-logo-registered-card.png" alt="ElectroGuy" width="220" style="display:block;max-width:220px;height:auto;border:0;">
              </td>
            </tr>
            <tr>
              <td style="padding:36px 42px 10px 42px;">
                <h1 style="margin:0 0 26px 0;font-size:28px;line-height:1.25;color:#111111;">Your proforma invoice is ready</h1>
                <p style="margin:0 0 18px 0;font-size:16px;line-height:1.75;color:#333333;">Dear ${escapeHtml(customerName)},</p>
                <p style="margin:0 0 24px 0;font-size:16px;line-height:1.75;color:#333333;">
                  Thank you for your order <strong>${escapeHtml(order.name)}</strong> with <strong>ElectroGuy</strong>.
                  Please find your proforma tax invoice attached as a PDF.
                </p>
                <div style="margin:30px 0;padding:22px 24px;border-left:5px solid #bdec34;background:#f6f7f3;">
                  <p style="margin:0;font-size:15px;line-height:1.65;color:#222222;">
                    <strong>Payment:</strong> Kindly complete payment as per the attached invoice to confirm your order and send proof of payment (POP) to info@electroguy.co.za.
                    Use <strong>${escapeHtml(payment.paymentReference)}</strong> as the payment reference. Once payment is received,
                    we will process and dispatch your items.
                  </p>
                  ${payment.bankName && payment.accountNumber ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;font-size:14px;line-height:1.55;color:#333333;">
                    ${emailPaymentRow("Bank", payment.bankName)}
                    ${emailPaymentRow("Account Name", payment.accountName)}
                    ${emailPaymentRow("Account Number", payment.accountNumber)}
                    ${emailPaymentRow("Branch Code", payment.branchCode)}
                    ${emailPaymentRow("Account Type", payment.accountType)}
                    ${emailPaymentRow("SWIFT Code", payment.swiftCode)}
                    ${emailPaymentRow("Bank Address", payment.bankAddress)}
                  </table>` : ""}
                </div>
                <p style="margin:0 0 22px 0;font-size:15px;line-height:1.75;color:#333333;">
                  Standard delivery is <strong>2-3 business days</strong> after payment clears. Express delivery is available at
                  <strong>R350</strong> and usually takes <strong>1-2 business days</strong>.
                </p>
                <p style="margin:0 0 30px 0;font-size:15px;line-height:1.75;color:#333333;">
                  If you have any questions about payment, delivery, or product availability, reply to this email or contact us at
                  <a href="mailto:${BRAND.email}" style="color:#3f5f00;font-weight:700;">${BRAND.email}</a>.
                </p>
                <p style="margin:0;font-size:15px;line-height:1.65;color:#333333;">
                  Warm regards,<br>
                  <strong>ElectroGuy Team</strong><br>
                  <a href="mailto:${BRAND.email}" style="color:#3f5f00;font-weight:700;">${BRAND.email}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 42px 34px 42px;">
                <div style="border-top:1px solid #e4e4e4;padding-top:20px;font-size:13px;line-height:1.7;color:#777777;">
                  <a href="${BRAND.website}" style="color:#3f5f00;font-weight:700;">electroguy.co.za</a>
                  <span style="color:#bbbbbb;"> &nbsp;|&nbsp; </span>
                  <a href="mailto:${BRAND.email}" style="color:#3f5f00;font-weight:700;">${BRAND.email}</a>
                  <span style="color:#bbbbbb;"> &nbsp;|&nbsp; </span>
                  South Africa
                  <br>
                  Premium phones, laptops, gaming technology, desktops, printers and server hardware. All prices include VAT.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `Dear ${customerName},`,
    "",
    `Thank you for your order ${order.name} with ElectroGuy. Please find your proforma tax invoice attached as a PDF.`,
    "",
    `Kindly complete payment as per the invoice to confirm your order. Use ${payment.paymentReference} as the payment reference. Once payment is received, we will process and dispatch your items.`,
    "",
    "Standard delivery is 2-3 business days after payment clears. Express delivery is available at R350 and usually takes 1-2 business days.",
    "",
    `For queries, contact ${BRAND.email}.`,
    "",
    "Warm regards,",
    "ElectroGuy Team"
  ].join("\n");

  return { subject, html, text, invoiceNumber };
}

export async function sendProformaEmail({ order, pdfBuffer, overrideEmail, paymentDetails }) {
  const email = getEmailConfig();
  if (!email.resendApiKey) {
    return {
      sent: false,
      reason: "Missing RESEND_API_KEY. PDF generated, but email was not sent."
    };
  }

  const to = overrideEmail || order.customerEmail;
  if (!to) throw new Error("The order has no customer email. Add a recipient email before sending.");

  const message = buildProformaEmail(order, { paymentDetails });
  const payload = {
    from: email.from,
    to: [to],
    reply_to: email.replyTo,
    subject: message.subject,
    html: message.html,
    text: message.text,
    attachments: [
      {
        filename: `${message.invoiceNumber}-ElectroGuy-Proforma-Tax-Invoice.pdf`,
        content: pdfBuffer.toString("base64")
      }
    ]
  };
  if (email.bcc) payload.bcc = email.bcc.split(",").map((value) => value.trim()).filter(Boolean);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${email.resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || `Resend email failed with status ${response.status}`);
  }
  return { sent: true, providerId: body.id, to, subject: message.subject };
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function emailPaymentRow(label, value) {
  if (!value) return "";
  return `<tr>
    <td style="padding:2px 12px 2px 0;color:#555555;">${escapeHtml(label)}:</td>
    <td style="padding:2px 0;font-weight:700;color:#111111;text-align:right;">${escapeHtml(value)}</td>
  </tr>`;
}
