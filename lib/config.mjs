export const BRAND = {
  name: "ElectroGuy",
  legalName: "ElectroGuy",
  website: "https://electroguy.co.za",
  email: "info@electroguy.co.za",
  slogan: "Premium phones, laptops, desktops, printers, servers and gaming technology.",
  returnPolicyUrl: "https://electroguy.co.za/policies/refund-policy",
  logoPath: "public/electroguy-logo-registered-card.png",
  accent: "#bdec34",
  black: "#050505",
  soft: "#f6f7f3"
};

export const VAT_RATE = 0.15;

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "Manasata@0123";
}

export function getShopifyConfig() {
  const store = process.env.SHOPIFY_STORE_DOMAIN || "5p1011-0z.myshopify.com";
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const version = process.env.SHOPIFY_API_VERSION || "2026-04";
  return { store, token, version };
}

export function getPaymentConfig() {
  return {
    bankName: process.env.BANK_NAME || "",
    accountName: process.env.BANK_ACCOUNT_NAME || "ElectroGuy",
    accountNumber: process.env.BANK_ACCOUNT_NUMBER || "",
    branchCode: process.env.BANK_BRANCH_CODE || "",
    accountType: process.env.BANK_ACCOUNT_TYPE || "",
    swiftCode: process.env.BANK_SWIFT_CODE || "",
    bankAddress: process.env.BANK_ADDRESS || "",
    paymentReference: "",
    paymentMethods: process.env.PAYMENT_METHODS || "EFT, cross-border transfer and wire transfer"
  };
}

export function normalizePaymentDetails(input = {}) {
  const fallback = getPaymentConfig();
  return {
    accountName: clean(input.accountName) || fallback.accountName,
    bankName: clean(input.bankName) || fallback.bankName,
    accountType: clean(input.accountType) || fallback.accountType,
    accountNumber: clean(input.accountNumber) || fallback.accountNumber,
    branchCode: clean(input.branchCode) || fallback.branchCode,
    swiftCode: clean(input.swiftCode) || fallback.swiftCode,
    bankAddress: clean(input.bankAddress) || fallback.bankAddress,
    paymentReference: clean(input.paymentReference) || fallback.paymentReference,
    paymentMethods: clean(input.paymentMethods) || fallback.paymentMethods
  };
}

function clean(value) {
  return String(value || "").trim();
}

export function getEmailConfig() {
  return {
    resendApiKey: process.env.RESEND_API_KEY || "",
    from: process.env.INVOICE_FROM_EMAIL || `ElectroGuy Invoices <${BRAND.email}>`,
    replyTo: process.env.INVOICE_REPLY_TO || BRAND.email,
    bcc: process.env.INVOICE_BCC || BRAND.email
  };
}
