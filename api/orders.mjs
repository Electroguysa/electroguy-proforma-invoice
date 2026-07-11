import { requireAdmin, sendError, sendJson, method } from "../lib/http.mjs";
import { searchOrders } from "../lib/shopify.mjs";

export default async function handler(req, res) {
  try {
    if (!method(req, res, ["GET"])) return;
    if (!requireAdmin(req, res)) return;

    const url = new URL(req.url, `https://${req.headers.host || "electroguy.co.za"}`);
    const query = url.searchParams.get("q") || "";
    const orders = await searchOrders(query);
    sendJson(res, 200, { orders });
  } catch (error) {
    sendError(res, error);
  }
}
