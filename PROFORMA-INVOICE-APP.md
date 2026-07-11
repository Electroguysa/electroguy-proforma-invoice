# ElectroGuy Proforma Tax Invoice App

This Vercel app lets ElectroGuy fetch a Shopify order, preview or download a VAT-inclusive proforma tax invoice PDF, and email it to the customer as an attachment.

## App URL

After deployment, open:

```text
https://your-vercel-domain.vercel.app/invoice
```

Login password:

```text
Manasata@0123
```

You can change the password later by updating `ADMIN_PASSWORD` in Vercel.

## What It Does

- Searches Shopify orders by order number, email, or customer name.
- Generates a clean `PROFORMA TAX INVOICE` PDF.
- Shows all line item prices as VAT inclusive.
- Shows subtotal excluding VAT, VAT included at 15%, shipping, and total including VAT.
- Adds ElectroGuy terms and conditions.
- Supports preview and PDF download before sending.
- Lets you enter bank details per invoice before preview/download/send.
- Optional wire-transfer fields include SWIFT code, bank address, and account type.
- Sends an email with the PDF attached through Resend.

## Required Vercel Environment Variables

Copy `.env.example` into Vercel Environment Variables.

Required:

```text
ADMIN_PASSWORD=Manasata@0123
SHOPIFY_STORE_DOMAIN=5p1011-0z.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=your Shopify Admin API token
RESEND_API_KEY=your Resend API key
INVOICE_FROM_EMAIL=ElectroGuy Invoices <info@electroguy.co.za>
INVOICE_REPLY_TO=info@electroguy.co.za
INVOICE_BCC=info@electroguy.co.za
```

Recommended:

```text
BANK_NAME=
BANK_ACCOUNT_NAME=ElectroGuy
BANK_ACCOUNT_NUMBER=
BANK_BRANCH_CODE=
BANK_ACCOUNT_TYPE=
BANK_SWIFT_CODE=
BANK_ADDRESS=
PAYMENT_METHODS=EFT, cross-border transfer and wire transfer
```

The dashboard also lets you override these bank details per invoice. Required invoice fields are account holder name, bank name, account number, branch code, and payment reference. Account type, SWIFT code, and bank address are optional.

## Shopify Token

Create a custom Shopify Admin app with order read access.

Minimum required scope:

```text
read_orders
```

If Shopify asks for additional order access because some orders are older than 60 days, enable the required protected order access in Shopify Admin.

## Resend Setup

1. Sign up at Resend.
2. Verify `electroguy.co.za`.
3. Add the DNS records Resend gives you.
4. Create an API key.
5. Add it to Vercel as `RESEND_API_KEY`.

Only use `info@electroguy.co.za` as the sender after the domain is verified.

## Local Development

Install dependencies:

```bash
npm install
```

Create `.env.local` from `.env.example`, then run:

```bash
npm run dev:invoice
```

Open:

```text
http://localhost:3000/invoice
```

## Invoice Terms Included

The PDF includes:

1. Invoice validity for 24 hours from issue.
2. Payment due in full before delivery.
3. Goods remain the property of ElectroGuy until full payment is received.
4. Invoice number must be used as EFT payment reference.
5. Prices are in ZAR and VAT inclusive at 15%.
6. Returns and exchanges are subject to the ElectroGuy Returns Policy.
7. Delivery lead times are 2-3 business days for JHB and CPT, and 1-2 business days for express delivery.
8. Contact email: `info@electroguy.co.za`.

## Files Added

- `public/invoice-app.html`
- `public/electroguy-logo-registered-card.png`
- `api/orders.mjs`
- `api/proforma-pdf.mjs`
- `api/send-proforma.mjs`
- `lib/config.mjs`
- `lib/http.mjs`
- `lib/money.mjs`
- `lib/shopify.mjs`
- `lib/proforma-pdf.mjs`
- `lib/proforma-email.mjs`
- `vercel.json`
- `.env.example`
