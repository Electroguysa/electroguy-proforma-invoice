import { readJson, requireAdmin, sendError, method } from "../lib/http.mjs";
import { generateProformaPdf } from "../lib/proforma-pdf.mjs";
import { findOrderByNameOrId, getOrderById } from "../lib/shopify.mjs";
import { compactOrderNumber } from "../lib/money.mjs";

export default async function handler(req, res) {
  try {
    if (!method(req, res, ["GET", "POST"])) return;
    if (!requireAdmin(req, res)) return;

    const url = new URL(req.url, `https://${req.headers.host || "electroguy.co.za"}`);
    const body = req.method === "POST" ? await readJson(req) : {};
    const orderId = body.orderId || url.searchParams.get("orderId");
    const orderNumber = body.order || url.searchParams.get("order");
    if (!orderId && !orderNumber) throw new Error("Provide orderId or order query.");

    const order = orderId ? await getOrderById(orderId) : await findOrderByNameOrId(orderNumber);
    const pdf = await generateProformaPdf(order, { paymentDetails: body.paymentDetails || {} });
    const filename = `EG-${compactOrderNumber(order.name)}-ElectroGuy-Proforma-Tax-Invoice.pdf`;

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", String(pdf.length));
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.end(pdf);
  } catch (error) {
    sendError(res, error);
  }
}
