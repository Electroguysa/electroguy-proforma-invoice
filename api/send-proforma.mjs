import { method, readJson, requireAdmin, sendError, sendJson } from "../lib/http.mjs";
import { buildProformaEmail, sendProformaEmail } from "../lib/proforma-email.mjs";
import { generateProformaPdf } from "../lib/proforma-pdf.mjs";
import { findOrderByNameOrId, getOrderById } from "../lib/shopify.mjs";

export default async function handler(req, res) {
  try {
    if (!method(req, res, ["POST"])) return;
    if (!requireAdmin(req, res)) return;

    const body = await readJson(req);
    const orderId = body.orderId;
    const orderQuery = body.order || body.query;
    if (!orderId && !orderQuery) throw new Error("Provide orderId or order number.");

    const order = orderId ? await getOrderById(orderId) : await findOrderByNameOrId(orderQuery);
    const paymentDetails = body.paymentDetails || {};
    const pdfBuffer = await generateProformaPdf(order, { paymentDetails });
    const emailPreview = buildProformaEmail(order, { paymentDetails });
    const result = await sendProformaEmail({
      order,
      pdfBuffer,
      overrideEmail: body.email || "",
      paymentDetails
    });

    sendJson(res, 200, {
      order: {
        id: order.id,
        name: order.name,
        customerName: order.customerName,
        customerEmail: order.customerEmail
      },
      invoiceNumber: emailPreview.invoiceNumber,
      email: result
    });
  } catch (error) {
    sendError(res, error);
  }
}
