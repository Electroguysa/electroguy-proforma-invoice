import { VAT_RATE } from "./config.mjs";

export function cents(amount) {
  const value = Number(amount || 0);
  return Math.round(value * 100);
}

export function fromCents(value) {
  return Number(value || 0) / 100;
}

export function formatMoney(amount, currency = "ZAR") {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2
  }).format(Number(amount || 0));
}

export function vatFromInclusive(amount) {
  const total = Number(amount || 0);
  return total * (VAT_RATE / (1 + VAT_RATE));
}

export function exclVatFromInclusive(amount) {
  const total = Number(amount || 0);
  return total - vatFromInclusive(total);
}

export function compactOrderNumber(name = "") {
  return String(name).replace(/^#/, "") || "ORDER";
}
