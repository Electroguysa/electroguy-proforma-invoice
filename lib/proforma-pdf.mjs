import PDFDocument from "pdfkit";
import { createReadStream, existsSync } from "node:fs";
import { join } from "node:path";
import { BRAND, normalizePaymentDetails } from "./config.mjs";
import { compactOrderNumber, exclVatFromInclusive, formatMoney, vatFromInclusive } from "./money.mjs";

const PAGE = {
  margin: 42,
  width: 595.28,
  height: 841.89
};

export async function generateProformaPdf(order, options = {}) {
  const doc = new PDFDocument({
    size: "A4",
    margin: PAGE.margin,
    bufferPages: true,
    info: {
      Title: `ElectroGuy Proforma Tax Invoice ${order.name}`,
      Author: BRAND.name,
      Subject: `VAT-inclusive proforma tax invoice for ${order.name}`
    }
  });

  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  drawHeader(doc, order);
  drawCustomerBlock(doc, order);
  drawItemsTable(doc, order);
  drawTotals(doc, order);
  drawPaymentDetails(doc, order, options.paymentDetails);
  drawTerms(doc);
  drawFooters(doc);

  doc.end();
  return done;
}

function drawHeader(doc, order) {
  const logoPath = join(process.cwd(), BRAND.logoPath);

  doc.rect(0, 0, PAGE.width, 118).fill(BRAND.black);
  if (existsSync(logoPath)) {
    doc.image(logoPath, PAGE.margin, 24, { width: 165 });
  } else {
    doc.fillColor("white").fontSize(24).font("Helvetica-Bold").text(BRAND.name, PAGE.margin, 36);
  }

  doc.fillColor(BRAND.accent).font("Helvetica-Bold").fontSize(22).text("PROFORMA TAX INVOICE", 315, 30, {
    width: 238,
    align: "right"
  });
  doc.fillColor("white").font("Helvetica").fontSize(9).text("All prices include VAT at 15%", 315, 60, {
    width: 238,
    align: "right"
  });
  doc.fillColor("#d9d9d9").fontSize(9).text(`Invoice: EG-${compactOrderNumber(order.name)}`, 315, 78, {
    width: 238,
    align: "right"
  });
  doc.text(`Issued: ${formatDate(new Date())}`, 315, 94, {
    width: 238,
    align: "right"
  });

  doc.moveDown();
}

function drawCustomerBlock(doc, order) {
  doc.y = 145;
  doc.fillColor(BRAND.black).font("Helvetica-Bold").fontSize(10).text("BILLED TO", PAGE.margin, doc.y);
  doc.font("Helvetica").fontSize(10).fillColor("#202020");
  const leftTop = doc.y + 16;
  doc.text(order.customerName || "Customer", PAGE.margin, leftTop);
  if (order.customerEmail) doc.text(order.customerEmail);
  if (order.customerPhone) doc.text(order.customerPhone);
  drawAddress(doc, order.billingAddress || order.shippingAddress);

  doc.fillColor(BRAND.black).font("Helvetica-Bold").fontSize(10).text("DELIVERY DETAILS", 330, 145);
  doc.font("Helvetica").fontSize(10).fillColor("#202020");
  doc.text("Standard delivery: 2-3 business days", 330, 161);
  doc.text("Express delivery: 1-2 business days, R350", 330);
  doc.text("JHB & CPT delivery lead times apply after payment clears.", 330, doc.y + 3, { width: 215 });
  doc.y = Math.max(doc.y, 228);
}

function drawItemsTable(doc, order) {
  ensureSpace(doc, 160);
  const startY = doc.y + 8;
  const cols = {
    item: PAGE.margin,
    qty: 286,
    unit: 330,
    vat: 415,
    total: 490
  };

  doc.rect(PAGE.margin, startY, 512, 30).fill(BRAND.black);
  doc.fillColor("white").font("Helvetica-Bold").fontSize(8.5);
  doc.text("ITEM", cols.item + 10, startY + 10, { width: 220 });
  doc.text("QTY", cols.qty, startY + 10, { width: 35, align: "right" });
  doc.text("UNIT PRICE\nINCL. VAT", cols.unit, startY + 6, { width: 70, align: "right" });
  doc.text("VAT\nINCLUDED", cols.vat, startY + 6, { width: 58, align: "right" });
  doc.text("LINE TOTAL\nINCL. VAT", cols.total, startY + 6, { width: 62, align: "right" });

  doc.y = startY + 40;
  doc.fillColor("#191919");

  order.lineItems.forEach((item, index) => {
    const rowHeight = Math.max(48, doc.heightOfString(item.title, { width: 210 }) + 27);
    ensureSpace(doc, rowHeight + 20);
    const y = doc.y;
    if (index % 2 === 0) doc.rect(PAGE.margin, y - 8, 512, rowHeight).fill("#fafafa");

    doc.fillColor("#151515").font("Helvetica-Bold").fontSize(9.2).text(item.title, cols.item + 10, y, { width: 210 });
    if (item.sku) {
      doc.fillColor("#6b6b6b").font("Helvetica").fontSize(8).text(`SKU: ${item.sku}`, cols.item + 10, doc.y + 3, { width: 210 });
    }

    doc.fillColor("#151515").font("Helvetica").fontSize(9.2);
    doc.text(String(item.quantity), cols.qty, y, { width: 35, align: "right" });
    doc.text(formatMoney(item.unitPrice, order.currency), cols.unit, y, { width: 70, align: "right" });
    doc.text(formatMoney(vatFromInclusive(item.lineTotal), order.currency), cols.vat, y, { width: 58, align: "right" });
    doc.font("Helvetica-Bold").text(formatMoney(item.lineTotal, order.currency), cols.total, y, { width: 62, align: "right" });
    doc.y = y + rowHeight + 5;
  });
}

function drawTotals(doc, order) {
  ensureSpace(doc, 130);
  const total = order.total || order.lineItems.reduce((sum, item) => sum + item.lineTotal, 0) + order.shipping;
  const vat = vatFromInclusive(total);
  const excl = exclVatFromInclusive(total);

  const x = 345;
  const y = doc.y + 8;
  doc.fillColor(BRAND.black).font("Helvetica-Bold").fontSize(10);
  totalLine(doc, x, y, "Subtotal excluding VAT", excl, order.currency, false);
  totalLine(doc, x, y + 22, "VAT included (15%)", vat, order.currency, false);
  totalLine(doc, x, y + 44, "Shipping included", order.shipping || 0, order.currency, false);
  doc.rect(x - 8, y + 70, 205, 35).fill(BRAND.black);
  doc.fillColor("white").font("Helvetica-Bold").fontSize(11).text("TOTAL INCL. VAT", x, y + 82);
  doc.text(formatMoney(total, order.currency), x + 88, y + 82, { width: 93, align: "right" });
  doc.y = y + 120;
}

function drawPaymentDetails(doc, order, paymentInput) {
  ensureSpace(doc, 185);
  const payment = normalizePaymentDetails(paymentInput);
  if (!payment.paymentReference) payment.paymentReference = `EG-${compactOrderNumber(order.name)}`;
  const y = doc.y + 5;

  doc.rect(PAGE.margin, y, 512, 26).fill(BRAND.black);
  doc.fillColor(BRAND.accent).font("Helvetica-Bold").fontSize(10).text("PAYMENT DETAILS", PAGE.margin + 12, y + 8);

  const boxY = y + 26;
  doc.rect(PAGE.margin, boxY, 512, 132).strokeColor("#141414").lineWidth(1).stroke();
  doc.fillColor(BRAND.black).font("Helvetica-Bold").fontSize(10.5).text("Payment Terms: EFT / Wire Transfer", PAGE.margin + 15, boxY + 15);
  doc.moveTo(PAGE.margin + 15, boxY + 36).lineTo(PAGE.margin + 497, boxY + 36).strokeColor("#666").stroke();
  doc.font("Helvetica-Bold").fontSize(11).fillColor(BRAND.black).text("PLEASE MAKE PAYMENT TO:", PAGE.margin + 15, boxY + 52);

  const rows = [
    ["Bank:", payment.bankName],
    ["Account Name:", payment.accountName],
    ["Account No:", payment.accountNumber],
    ["Branch Code:", payment.branchCode],
    ["Payment Reference:", payment.paymentReference],
    ["Account Type:", payment.accountType],
    ["SWIFT Code:", payment.swiftCode],
    ["Bank Address:", payment.bankAddress]
  ].filter(([, value]) => value);

  let rowY = boxY + 78;
  rows.forEach(([label, value], index) => {
    if (index === 4) {
      rowY = boxY + 78;
    }
    const colX = index < 4 ? PAGE.margin + 15 : PAGE.margin + 276;
    const valueX = index < 4 ? PAGE.margin + 130 : PAGE.margin + 382;
    doc.fillColor("#242424").font("Helvetica").fontSize(9.4).text(label, colX, rowY, { width: 105 });
    doc.fillColor(BRAND.black).font("Helvetica-Bold").fontSize(9.4).text(value, valueX, rowY, { width: index < 4 ? 128 : 120, align: "right" });
    rowY += 18;
  });

  doc.y = y + 178;
}

function drawTerms(doc) {
  ensureSpace(doc, 210);
  const terms = [
    "This invoice is valid for 24 hrs from the date of issue. After this period, prices may be subject to change.",
    "Payment is due in full before delivery. Goods remain the property of ElectroGuy until full payment is received.",
    "Please use the invoice number as your payment reference when making an EFT payment.",
    "All prices are in South African Rand (ZAR). All prices are VAT inclusive (15%).",
    `Returns and exchanges are subject to our Returns Policy available at ${BRAND.returnPolicyUrl}.`,
    "Delivery lead times are 2-3 business days (JHB & CPT) and 1-2 business days for express delivery.",
    `For queries, contact us at ${BRAND.email}.`
  ];

  doc.fillColor(BRAND.black).font("Helvetica-Bold").fontSize(11).text("TERMS & CONDITIONS", PAGE.margin, doc.y);
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(8.8).fillColor("#252525");
  terms.forEach((term, index) => {
    ensureSpace(doc, 28);
    const y = doc.y;
    doc.font("Helvetica-Bold").text(`${index + 1}.`, PAGE.margin, y, { width: 18 });
    doc.font("Helvetica").text(term, PAGE.margin + 20, y, { width: 490 });
    doc.moveDown(0.45);
  });
}

function drawFooters(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.rect(0, PAGE.height - 64, PAGE.width, 64).fill(BRAND.black);
    doc.fillColor(BRAND.accent).font("Helvetica-Bold").fontSize(8.5).text(BRAND.website, PAGE.margin, PAGE.height - 48);
    doc.fillColor("white").font("Helvetica").fontSize(8).text(`${BRAND.email} | South Africa`, PAGE.margin, PAGE.height - 34);
    doc.fillColor("#d7d7d7").fontSize(7.5).text(`${BRAND.slogan} All prices include VAT. Governed by the Consumer Protection Act (CPA) 68 of 2008.`, PAGE.margin, PAGE.height - 20, { width: 512 });
    doc.fillColor("#888").fontSize(7).text(`Page ${i + 1} of ${range.count}`, 480, PAGE.height - 48, { width: 74, align: "right" });
  }
}

function totalLine(doc, x, y, label, amount, currency, bold) {
  doc.fillColor(BRAND.black).font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9.4);
  doc.text(label, x, y, { width: 110 });
  doc.text(formatMoney(amount, currency), x + 113, y, { width: 76, align: "right" });
}

function drawAddress(doc, address) {
  if (!address) return;
  [address.company, address.address1, address.address2, [address.city, address.province, address.zip].filter(Boolean).join(", "), address.country]
    .filter(Boolean)
    .forEach((line) => doc.text(line, { width: 230 }));
}

function ensureSpace(doc, needed) {
  if (doc.y + needed < PAGE.height - 92) return;
  doc.addPage();
  doc.y = PAGE.margin;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(date);
}
